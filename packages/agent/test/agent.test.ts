import { describe, expect, it } from 'vitest';
import {
  allSettled,
  combine,
  createEffect,
  createEvent,
  createStore,
  createWatch,
  fork,
  sample,
  type Scope,
} from 'effector';
import {
  createMemoryTransportPair,
  decode,
  type AgentMessage,
  type TraceFile,
} from '@deffector/protocol';
import { Agent } from '../src/agent';
import { asInternalScope, type Node } from '../src/effector';

function setup() {
  const agent = new Agent({ name: 'test' });
  const pair = createMemoryTransportPair();
  agent.connect(pair.agent);
  const inbox: AgentMessage[] = [];
  pair.panel.subscribe((message) => inbox.push(message));
  pair.panel.send({ type: 'connect', locale: 'en' });
  const flush = async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 60);
    });
  };
  const txs = () => agent.history.transactions.map((transaction) => agent.encodeTx(transaction));
  const name = (id: string) => agent.registry.get(id)?.info.name;
  return { agent, inbox, flush, txs, name, panel: pair.panel };
}

/** The graph node behind a unit. */
const nodeOf = (unit: object) => (unit as { graphite: Node }).graphite;

describe('transactions', () => {
  it('groups a cascade into one transaction with statuses', async () => {
    const { agent, flush, txs, name } = setup();
    const inc = createEvent<number>({ name: 'inc' });
    const $count = createStore(0, { name: '$count' }).on(inc, (count, delta) => count + delta);
    const $double = $count.map((count) => count * 2);
    $double.watch(() => {});
    const scope = fork();
    agent.registerScope(scope, { name: 'client' });
    await allSettled(inc, { scope, params: 2 });
    await allSettled(inc, { scope, params: 0 });
    await flush();
    const scoped = txs().filter((tx) => tx.scopeId !== 'global');
    expect(scoped).toHaveLength(2);
    const [changing, same] = scoped;
    expect(name(changing.root)).toBe('inc');
    const countStep = changing.steps.find((step) => step.node === nodeOf($count).id)!;
    expect(countStep.status).toBe('changed');
    expect(changing.changes.map((change) => name(change.node))).toContain('$count');
    const sameCountStep = same.steps.find((step) => step.node === nodeOf($count).id)!;
    expect(sameCountStep.status).toBe('same');
    expect(same.changes).toHaveLength(0);
    expect(agent.scopes.nameOf(changing.scopeId)).toBe('client');
  });

  it('marks a sample stopped by filter', async () => {
    const { agent, flush, txs } = setup();
    const submit = createEvent({ name: 'submit' });
    const $ok = createStore(false, { name: '$ok' });
    const target = createEvent({ name: 'target' });
    sample({ clock: submit, filter: $ok, target });
    const scope = fork();
    agent.registerScope(scope);
    await allSettled(submit, { scope });
    await flush();
    const tx = txs().at(-1)!;
    expect(tx.flags.blocked?.length).toBe(1);
    expect(tx.steps.some((step) => step.status === 'filtered')).toBe(true);
  });

  it('links effect results to the call by fxID', async () => {
    const { agent, flush, txs, name } = setup();
    const go = createEvent<string>({ name: 'go' });
    const fx = createEffect({ name: 'fx', handler: async (text: string) => text.toUpperCase() });
    const $result = createStore('', { name: '$res' }).on(fx.doneData, (_, result) => result);
    sample({ clock: go, target: fx });
    const scope = fork();
    agent.registerScope(scope);
    await allSettled(go, { scope, params: 'a' });
    await flush();
    const all = txs();
    const call = all.find((tx) => tx.calls.length)!;
    const settle = all.find((tx) => tx.settle)!;
    expect(call.calls[0].fxId).toBe(settle.settle!.fxId);
    expect(settle.cause).toMatchObject({ kind: 'effect', txId: call.id });
    expect(settle.settle!.status).toBe('done');
    expect(settle.changes.map((change) => name(change.node))).toContain('$res');
    expect(scope.getState($result)).toBe('A');
  });

  it('flags calls outside of scope once fork is used', async () => {
    const { agent, flush, txs } = setup();
    const saved = createEvent<string>({ name: 'draftSaved' });
    createStore<string | null>(null, { name: '$draft' }).on(saved, (_, draft) => draft);
    const scope = fork();
    agent.registerScope(scope);
    saved('x');
    await flush();
    const tx = txs().at(-1)!;
    expect(tx.scopeId).toBe('global');
    expect(tx.flags.outOfScope).toBe(true);
    expect(agent.diagnostics.list().some((item) => item.code === 'out-of-scope')).toBe(true);
  });

  it('detects events called from a watcher as nested', async () => {
    const { flush, txs, name } = setup();
    const outer = createEvent({ name: 'a' });
    const inner = createEvent({ name: 'b' });
    createStore(0, { name: '$n' }).on(inner, (count) => count + 1);
    outer.watch(() => inner());
    outer();
    await flush();
    const lastTwo = txs().slice(-2);
    const nestedTx = lastTwo.find((tx) => name(tx.root) === 'b')!;
    const outerTx = lastTwo.find((tx) => name(tx.root) === 'a')!;
    expect(nestedTx.cause).toMatchObject({ kind: 'nested', txId: outerTx.id });
  });

  it('finds a double update caused by declaration order', async () => {
    const { agent, flush, txs, name } = setup();
    const update = createEvent<number>({ name: 'update' });
    const $s1 = createStore(0, { name: '$s1' }).on(update, (_, value) => value);
    const $s2 = createStore(0, { name: '$s2' });
    const $s3 = createStore(0, { name: '$s3' });
    // consumer declared before the samples that feed it
    const $sum = combine($s2, $s3, (left, right) => left + right);
    sample({ clock: $s1, fn: (value) => value + 1, target: $s2 });
    sample({ clock: $s1, fn: (value) => value + 10, target: $s3 });
    const scope = fork();
    agent.registerScope(scope);
    // somebody sees the intermediate value (a component subscribed in this scope)
    const seen: number[] = [];
    createWatch({ unit: $sum, scope, fn: (sum) => seen.push(sum) });
    await allSettled(update, { scope, params: 1 });
    await flush();
    const tx = txs().at(-1)!;
    expect(scope.getState($sum)).toBe(13);
    expect(seen).toEqual([2, 13]);
    expect((tx.flags.double || []).map(name)).toContain(name(nodeOf($sum).id));
  });

  it('reports exceptions in pure functions and keeps the kernel alive', async () => {
    const { flush, txs } = setup();
    const boom = createEvent({ name: 'boom' });
    createStore(0, { name: '$x' }).on(boom, () => {
      throw new Error('nope');
    });
    const originalConsoleError = console.error;
    console.error = () => {};
    try {
      boom();
    } finally {
      console.error = originalConsoleError;
    }
    const fx = createEffect(async () => 1);
    await fx();
    await flush();
    const tx = txs().find((candidate) => candidate.flags.error)!;
    expect(tx.steps.some((step) => step.status === 'error')).toBe(true);
  });
});

describe('time travel', () => {
  it('jumps in place in global mode and returns to the present', async () => {
    const { agent, flush } = setup();
    const set = createEvent<string>({ name: 'set' });
    const $value = createStore('a', { name: '$v' }).on(set, (_, value) => value);
    set('b');
    set('c');
    set('d');
    await flush();
    const ids = agent.history.transactions
      .filter((transaction) => transaction.root === nodeOf(set))
      .map((transaction) => transaction.id);
    agent.jump(ids[0]);
    expect($value.getState()).toBe('b');
    expect(agent.timeline.mode).toBe('past');
    agent.jump(ids[1]);
    expect($value.getState()).toBe('c');
    agent.goLive();
    expect($value.getState()).toBe('d');
  });

  it('renders a forked copy of the past through the adapter switcher', async () => {
    const { agent, flush } = setup();
    const set = createEvent<number>({ name: 'setN' });
    const $number = createStore(0, { name: '$n2' }).on(set, (_, value) => value);
    const $square = $number.map((value) => value * value);
    const live = fork();
    let shown: Scope = live;
    agent.registerScope(live, {
      name: 'client',
      switcher: (switched) => {
        shown = switched;
      },
    });
    await allSettled(set, { scope: live, params: 2 });
    await allSettled(set, { scope: live, params: 3 });
    await allSettled(set, { scope: live, params: 4 });
    await flush();
    const first = agent.history.transactions.find(
      (transaction) => transaction.scopeId !== 'global' && transaction.root === nodeOf(set),
    )!;
    agent.jump(first.id);
    expect(shown).not.toBe(live);
    expect(shown.getState($number)).toBe(2);
    expect(shown.getState($square)).toBe(4);
    expect(live.getState($number)).toBe(4);
    agent.goLive();
    expect(shown).toBe(live);
  });

  it('edits a store as a devtools transaction', async () => {
    const { agent, flush, txs } = setup();
    const $text = createStore('', { name: '$e' });
    const $length = $text.map((text) => text.length);
    const scope = fork();
    agent.registerScope(scope);
    const { id } = nodeOf($text);
    agent.edit(agent.scopes.idOf(asInternalScope(scope)), { [id]: 'hello' }, 'live', 'edit');
    await flush();
    expect(scope.getState($length)).toBe(5);
    expect(txs().at(-1)!.cause).toMatchObject({ kind: 'devtools', action: 'edit' });
  });
});

describe('traces', () => {
  it('exports a trace and replays it with recorded effect results', async () => {
    const { agent, flush } = setup();
    const emailChanged = createEvent<string>({ name: 'emailChanged', sid: 't-email-ev' });
    const passwordChanged = createEvent<string>({ name: 'passwordChanged', sid: 't-pass-ev' });
    const submitted = createEvent({ name: 'submitted', sid: 't-submit' });
    let calls = 0;
    const signUpFx = createEffect({
      name: 'signUpFx',
      sid: 't-fx',
      handler: async (email: string) => {
        calls += 1;
        if (email.endsWith('@taken.io')) throw new Error('409');
        return email;
      },
    });
    const $email = createStore('', { name: '$email', sid: 't-email' }).on(
      emailChanged,
      (_, email) => email,
    );
    createStore('', { name: '$password', sid: 't-pass' }).on(
      passwordChanged,
      (_, password) => password,
    );
    const $error = createStore<string | null>(null, { name: '$error', sid: 't-err' }).on(
      signUpFx.failData,
      (_, error) => error.message,
    );
    sample({ clock: submitted, source: $email, target: signUpFx });
    let shown: Scope | null = null;
    const live = fork();
    agent.registerScope(live, {
      name: 'client',
      switcher: (switched) => {
        shown = switched;
      },
    });
    await allSettled(emailChanged, { scope: live, params: 'ira@taken.io' });
    await allSettled(passwordChanged, { scope: live, params: 'secret-123' });
    await allSettled(submitted, { scope: live });
    await flush();
    expect(live.getState($error)).toBe('409');
    const trace = agent.traces.export(null);
    expect(trace.steps).toHaveLength(3);
    expect(trace.effectResults).toHaveLength(1);
    expect(trace.effectResults[0].status).toBe('fail');
    // password is masked with the same length
    const passwordStep = trace.steps.find(
      (step) => trace.units.find((unit) => unit.ref === step.unit)?.name === 'passwordChanged',
    )!;
    expect(passwordStep.params).toBe('••••••••••');
    expect(trace.redacted.length).toBeGreaterThan(0);
    const fromJson = JSON.parse(JSON.stringify(trace)) as TraceFile;
    const callsBefore = calls;
    await agent.replay(fromJson, 'instant');
    expect(calls).toBe(callsBefore);
    expect(shown).not.toBeNull();
    expect(shown!.getState($email)).toBe('ira@taken.io');
    expect(shown!.getState($error)).toBe('409');
    expect(decode(trace.steps[0].params)).toBe('ira@taken.io');
  });

  it('reports compatibility for a trace from another build', async () => {
    const { agent } = setup();
    createStore(0, { name: '$a', sid: 'cmp-a' });
    createEvent({ name: 'ev', sid: 'cmp-ev' });
    const report = agent.traces.checkCompatibility({
      format: 'deffector-trace@1',
      meta: {
        app: 'x',
        url: '',
        effector: '23.4.4',
        agent: '0.1.0',
        recordedAt: '',
        scope: { name: 'client', kind: 'scope' },
        build: 'other',
      },
      units: [
        { ref: '1', name: '$a', kind: 'store', sid: 'cmp-a' },
        { ref: '2', name: 'ev', kind: 'event', sid: 'moved' },
        { ref: '3', name: 'promoApplied', kind: 'event', sid: 'gone' },
      ],
      initial: {},
      steps: [
        { n: 1, t: 0, unit: '2', scope: 'scope', params: null },
        { n: 2, t: 1, unit: '3', scope: 'scope', params: null },
      ],
      effectResults: [],
      notes: [],
      redacted: [],
      lossy: [],
    });
    expect(report.mapping['1']).toBeTruthy();
    expect(report.mapping['2']).toBeTruthy();
    expect(report.mapping['3']).toBeUndefined();
    expect(report.skippedSteps).toEqual([2]);
    expect(report.rows.some((row) => row.level === 'error')).toBe(true);
  });
});

describe('scopes registered after the panel connected', () => {
  it('sends the timeline with the new live scope', async () => {
    const { agent, inbox, flush } = setup();
    await flush();
    const scope = fork();
    agent.registerScope(scope, { name: 'late', switcher: () => {} });
    await flush();
    const scopeId = agent.scopes.idOf(asInternalScope(scope));
    const timelines = inbox.filter(
      (message): message is Extract<AgentMessage, { type: 'timeline' }> =>
        message.type === 'timeline',
    );
    expect(timelines.at(-1)?.state.liveScopeId).toBe(scopeId);
  });
});

describe('inspector slot', () => {
  it('notices when effector/inspect takes the slot and can reclaim it', async () => {
    const { agent } = setup();
    expect(agent.checkInspector()).toBe(true);
    await import('effector/inspect');
    expect(agent.checkInspector()).toBe(false);
    expect(agent.diagnostics.list().some((item) => item.code === 'inspector-conflict')).toBe(true);
    await agent.handle({ type: 'reclaim' });
    expect(agent.checkInspector()).toBe(true);
  });
});
