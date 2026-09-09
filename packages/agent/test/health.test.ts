import { describe, expect, it } from 'vitest';
import {
  allSettled,
  combine,
  createDomain,
  createEffect,
  createEvent,
  createStore,
  createWatch,
  fork,
  sample,
} from 'effector';
import {
  createMemoryTransportPair,
  decode,
  encode,
  type AgentMessage,
  type TraceFile,
} from '@deffector/protocol';
import { Agent, type AgentOptions } from '../src/agent';
import { asInternalScope, type Node } from '../src/effector';

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function setup(options: AgentOptions = {}, isConnected = true) {
  const agent = new Agent({ name: 'test', ...options });
  const pair = createMemoryTransportPair();
  agent.connect(pair.agent);
  const inbox: AgentMessage[] = [];
  pair.panel.subscribe((message) => inbox.push(message));
  if (isConnected) pair.panel.send({ type: 'connect', locale: 'en' });
  const flush = () => sleep(60);
  const name = (id: string) => agent.registry.get(id)?.info.name;
  const codes = () => agent.diagnostics.list().map((item) => item.code);
  return { agent, inbox, flush, name, codes, panel: pair.panel };
}

/** The graph node behind a unit. */
const nodeOf = (unit: object) => (unit as { graphite: Node }).graphite;

type TraceMessage = Extract<AgentMessage, { type: 'trace' }>;

const isTraceMessage = (message: AgentMessage): message is TraceMessage => message.type === 'trace';

describe('pause while no panel is attached', () => {
  it('records during the grace period, pauses, and resumes on connect', async () => {
    const { agent, panel } = setup({ graceMs: 30 }, false);
    const ping = createEvent<number>({ name: 'pausePing' });
    ping(1);
    await sleep(5);
    expect(agent.history.transactions.length).toBeGreaterThan(0);
    await sleep(60);
    expect(agent.paused).toBe(true);
    expect(agent.history.transactions).toHaveLength(0);
    ping(2);
    await sleep(5);
    expect(agent.history.transactions).toHaveLength(0);
    panel.send({ type: 'connect', locale: 'en' });
    await sleep(5);
    expect(agent.paused).toBe(false);
    ping(3);
    await sleep(5);
    expect(agent.history.transactions).toHaveLength(1);
    expect(agent.diagnostics.list().some((item) => item.code === 'paused')).toBe(true);
  });
});

describe('emergency stop', () => {
  it('cuts an infinite synchronous loop through events and restores the graph', async () => {
    const { agent, flush, codes } = setup({ hardStop: 3000 });
    const loopA = createEvent<number>({ name: 'loopA' });
    const loopB = createEvent<number>({ name: 'loopB' });
    sample({ clock: loopA, fn: (count) => count + 1, target: loopB });
    sample({ clock: loopB, target: loopA });
    const edgesBefore = nodeOf(loopA).next.length;
    const startedAt = Date.now();
    loopA(1); // without the stop this never returns
    expect(Date.now() - startedAt).toBeLessThan(2000);
    await flush();
    expect(nodeOf(loopA).next.length).toBe(edgesBefore);
    expect(codes()).toContain('emergency-stop');
    const stop = agent.diagnostics.list().find((item) => item.code === 'emergency-stop')!;
    expect(stop.nodes?.length).toBeGreaterThan(0);
    // no false "stopped by filter" for the cut samples
    expect(codes()).not.toContain('filter-blocked');
    // the kernel still works
    const set = createEvent<number>();
    const $value = createStore(0).on(set, (_, value) => value);
    set(5);
    expect($value.getState()).toBe(5);
    // and the static scan names the cycle
    agent.scanCycles();
    agent.diagnostics.refreshStatic(true);
    expect(codes()).toContain('event-cycle');
  });
});

describe('glitches', () => {
  it('finds a sample that read a store before it was updated in the same transaction', async () => {
    const { agent, flush, name } = setup();
    const go = createEvent<number>({ name: 'go' });
    const out = createEvent<number>({ name: 'out' });
    const $a = createStore(0, { name: '$a' });
    const $b = createStore(0, { name: '$b' });
    const received: number[] = [];
    out.watch((value) => received.push(value));
    sample({ clock: $a, source: $b, target: out });
    sample({ clock: go, target: $a });
    sample({ clock: go, fn: (value) => value * 10, target: $b });
    const scope = fork();
    agent.registerScope(scope);
    await allSettled(go, { scope, params: 1 });
    await flush();
    expect(received).toEqual([0]); // the glitch: $b was already 10 in this transaction
    const transaction = agent.history.transactions.at(-1)!;
    expect(transaction.flags.staleReads?.map((staleRead) => name(staleRead.store))).toEqual(['$b']);
    const staleRead = agent.diagnostics.list().find((item) => item.code === 'stale-read');
    expect(staleRead?.title).toContain('$b');
  });

  it('lists what did not run after an exception and finds derived stores that disagree', async () => {
    const { agent, flush } = setup();
    const set = createEvent<number>({ name: 'setA' });
    const $source = createStore(1, { name: '$srcA' }).on(set, (_, value) => value);
    const $combined = combine($source, (value) => {
      if (value === 2) throw new Error('boom');
      return value * 10;
    });
    const $after = $combined.map((value) => value + 1);
    const scope = fork();
    agent.registerScope(scope);
    createWatch({ unit: $after, scope, fn: () => {} });
    await allSettled(set, { scope, params: 2 });
    await flush();
    const transaction = agent.history.transactions.at(-1)!;
    expect(transaction.flags.error).toBe(true);
    const mismatched = agent.checkConsistency(agent.scopes.idOf(asInternalScope(scope)));
    expect(mismatched.length).toBeGreaterThan(0);
    expect(agent.diagnostics.list().some((item) => item.code === 'inconsistent-derived')).toBe(
      true,
    );
  });
});

describe('effect overrides', () => {
  it('forces done, fail, latency and pending, and releases held calls', async () => {
    const { agent, flush } = setup();
    const fx = createEffect({
      name: 'loadFx',
      sid: 'loadFx',
      handler: async (count: number) => count * 2,
    });
    const $result = createStore<unknown>(null, { name: '$res' })
      .on(fx.doneData, (_, result) => result)
      .on(fx.failData, (_, error) => `fail:${error.message}`);
    const scope = fork();
    agent.registerScope(scope);
    const { id } = nodeOf(fx);

    agent.overrides.set({ node: id, mode: 'done', value: encode({ fake: true }) });
    await allSettled(fx, { scope, params: 1 });
    expect(scope.getState($result)).toEqual({ fake: true });

    agent.overrides.set({ node: id, mode: 'fail', value: encode('offline') });
    await allSettled(fx, { scope, params: 1 });
    expect(scope.getState($result)).toBe('fail:offline');

    agent.overrides.set({
      node: id,
      mode: 'handler',
      code: 'async n => (await original(n)) + 1000',
    });
    await allSettled(fx, { scope, params: 1 });
    expect(scope.getState($result)).toBe(1002);

    agent.overrides.set({ node: id, mode: 'pending' });
    const heldCall = fx(5); // global call: held
    let isSettled = false;
    heldCall.then(() => {
      isSettled = true;
    });
    await sleep(20);
    expect(isSettled).toBe(false);
    expect(fx.pending.getState()).toBe(true);
    agent.overrides.clear(id);
    await expect(heldCall).resolves.toBe(10);
    expect(agent.overrides.list()).toHaveLength(0);
    await flush();
  });
});

describe('notes, ignore rules and models', () => {
  it('stores a note on a transaction and exports it into the trace', async () => {
    const { agent, panel, inbox, flush } = setup();
    const noted = createEvent<number>({ name: 'noted' });
    createStore(0, { name: '$noted', sid: 'noted' }).on(noted, (_, value) => value);
    const scope = fork();
    agent.registerScope(scope);
    await allSettled(noted, { scope, params: 1 });
    await flush();
    const transaction = agent.history.transactions.at(-1)!;
    panel.send({ type: 'note', txId: transaction.id, text: 'here the total is wrong' });
    await flush();
    expect(
      inbox.some(
        (message) => message.type === 'tx-update' && message.tx.note === 'here the total is wrong',
      ),
    ).toBe(true);
    panel.send({ type: 'export', requestId: 'x', scopeId: null, focus: transaction.id });
    await flush();
    const { trace } = inbox.find(isTraceMessage)!;
    expect(trace.notes[0].text).toBe('here the total is wrong');
    expect(trace.meta.focus).toBe(transaction.id);
  });

  it('drops transactions matching an ignore rule but keeps snapshots right', async () => {
    const { agent, panel, inbox, flush } = setup();
    const noisy = createEvent<number>({ name: 'pollTick' });
    const real = createEvent<number>({ name: 'realThing' });
    const $polled = createStore(0, { name: '$polled', sid: 'polled' }).on(
      noisy,
      (_, value) => value,
    );
    createStore(0, { name: '$real', sid: 'real' }).on(real, (_, value) => value);
    const scope = fork();
    agent.registerScope(scope);
    panel.send({ type: 'set-ignore', rules: [{ pattern: '^poll' }] });
    await flush();
    await allSettled(real, { scope, params: 1 });
    await allSettled(noisy, { scope, params: 7 });
    await allSettled(real, { scope, params: 2 });
    await flush();
    const sent = inbox.flatMap((message) => (message.type === 'txs' ? message.txs : []));
    expect(sent.some((tx) => agent.registry.get(tx.root)?.info.name === 'pollTick')).toBe(false);
    // the state after the last visible transaction still has the polled value
    const lastVisible = agent.history.transactions
      .filter((transaction) => !transaction.flags.hidden)
      .at(-1)!;
    const values = agent.stateValues(lastVisible.scopeId, lastVisible.id);
    expect(values[nodeOf($polled).id]).toBe(7);
  });

  it('groups units of a model, including the @@debug protocol', () => {
    const { agent } = setup();
    const query = {
      $data: createStore(null, { name: '$data' }),
      start: createEvent({ name: 'start' }),
      '@@debug': () => ({ name: 'userQuery', units: { $data: query.$data, start: query.start } }),
    };
    const plain = {
      form: { $email: createStore('', { name: '$email' }) },
      submit: createEvent({ name: 'submit' }),
    };
    agent.registerModel(query);
    agent.registerModel(plain, 'signupForm');
    const modelOf = (unit: object) => agent.registry.get(nodeOf(unit).id)?.info.model;
    expect(modelOf(query.$data)).toBe('userQuery');
    expect(modelOf(plain.form.$email)).toBe('signupForm');
    expect(modelOf(plain.submit)).toBe('signupForm');
  });
});

describe('static checks', () => {
  it('reports units created again and again after start', async () => {
    const { agent, codes } = setup();
    const started = createEvent({ name: 'started' });
    started();
    await sleep(5);
    for (let i = 0; i < 4; i++) createStore(0, { name: '$perRender', sid: 'perRender' });
    agent.diagnostics.refreshStatic(true);
    expect(codes()).toContain('unit-leak');
    expect(codes()).not.toContain('duplicate-sid');
  });

  it('warns about server values for sids the client does not know', () => {
    const { agent, codes } = setup();
    createStore(0, { name: '$known', sid: 'known' });
    const scope = fork({ values: { known: 1, 'ghost-sid': 2 } });
    agent.registerScope(scope);
    agent.diagnostics.refreshStatic(true);
    expect(codes()).toContain('sid-mismatch');
    const mismatch = agent.diagnostics.list().find((item) => item.code === 'sid-mismatch')!;
    expect(mismatch.detail).toContain('ghost-sid');
  });

  it('reports the domain of a unit', () => {
    const { agent } = setup();
    const session = createDomain('auth').createDomain('session');
    const $token = session.createStore('', { name: '$token' });
    expect(agent.registry.get(nodeOf($token).id)?.info.domain).toBe('auth/session');
  });
});

describe('trace focus', () => {
  it('marks replayed transactions with the trace step they come from', async () => {
    const { agent, panel, inbox, flush } = setup();
    const step = createEvent<number>({ name: 'stepEv' });
    createStore(0, { name: '$stepStore', sid: 'stepStore' }).on(step, (_, value) => value);
    const scope = fork();
    agent.registerScope(scope, { switcher: () => {} });
    await allSettled(step, { scope, params: 1 });
    await allSettled(step, { scope, params: 2 });
    await flush();
    panel.send({ type: 'export', requestId: 'e', scopeId: null });
    await flush();
    const { trace }: { trace: TraceFile } = inbox.find(isTraceMessage)!;
    await agent.replay(trace, 'instant');
    await flush();
    const replayed = agent.history.transactions.filter(
      (transaction) => transaction.replayOf !== undefined,
    );
    expect(replayed.map((transaction) => transaction.replayOf)).toEqual(
      trace.steps.map((traceStep) => traceStep.n),
    );
    expect(decode(agent.encodeTx(replayed[1]).payload!)).toBe(2);
  });
});

describe('state at a past transaction', () => {
  it('recomputes derived stores from the snapshot (not their initial value)', async () => {
    const { agent, flush } = setup();
    const inc = createEvent({ name: 'incPast' });
    const $count = createStore(0, { name: '$nPast', sid: 'nPast' }).on(inc, (count) => count + 1);
    const $double = $count.map((count) => count * 2);
    const $sum = combine($count, $double, (count, double) => count + double);
    const scope = fork();
    agent.registerScope(scope);
    await allSettled(inc, { scope });
    await allSettled(inc, { scope });
    await allSettled(inc, { scope });
    await flush();
    const first = agent.history.transactions[0];
    const values = agent.stateValues(first.scopeId, first.id);
    expect(values[nodeOf($count).id]).toBe(1);
    expect(values[nodeOf($double).id]).toBe(2);
    expect(values[nodeOf($sum).id]).toBe(3);
  });
});
