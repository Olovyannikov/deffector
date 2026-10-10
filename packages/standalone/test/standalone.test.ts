/**
 * The standalone relay with an agent in a runtime like React Native's:
 * no window, no document, no location, no performance, no structuredClone;
 * WebSocket is a polyfill handed to the transport.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import {
  allSettled,
  createEffect,
  createEvent,
  createStore,
  fork,
  sample,
  type Scope,
} from 'effector';
import type { AgentMessage, Tx } from '@deffector/protocol';
import { Agent } from '@deffector/agent';
import { createWebSocketTransport } from '@deffector/agent/node';
// @ts-expect-error plain ESM module without types
import { startServer } from '../server.mjs';

/** Globals a React Native runtime does not have. */
const BROWSER_GLOBALS = [
  'window',
  'document',
  'location',
  'performance',
  'structuredClone',
  'navigator',
];
const globals = globalThis as unknown as Record<string, unknown>;
const removedGlobals: Record<string, unknown> = {};
let server: { port: number; close(): Promise<void> };

/** The `ws` package's client stands in for a React Native WebSocket polyfill. */
const WebSocketPolyfill = WebSocket as unknown as typeof globalThis.WebSocket;

beforeAll(async () => {
  for (const name of BROWSER_GLOBALS) {
    removedGlobals[name] = globals[name];
    try {
      delete globals[name];
    } catch {
      globals[name] = undefined;
    }
  }
  server = await startServer({ port: 0, log: () => {} });
});

afterAll(async () => {
  for (const [name, value] of Object.entries(removedGlobals)) {
    if (value !== undefined) globals[name] = value;
  }
  await server.close();
});

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const waitUntil = async (condition: () => boolean, timeoutMs = 3000) => {
  const startedAt = Date.now();
  while (!condition()) {
    if (Date.now() - startedAt > timeoutMs) throw new Error('timeout');
    await sleep(20);
  }
};

/** A panel-side socket, as the standalone page opens it, that collects every message. */
async function openPanelSocket() {
  const inbox: AgentMessage[] = [];
  const panel = new WebSocket(`ws://127.0.0.1:${server.port}/panel?agent=auto`);
  panel.on('message', (data) => inbox.push(JSON.parse(String(data))));
  await new Promise<void>((resolve) => {
    panel.on('open', () => resolve());
  });
  return { panel, inbox };
}

const agentUrl = () => `ws://127.0.0.1:${server.port}/agent`;

const collectTransactions = (inbox: AgentMessage[]): Tx[] =>
  inbox.flatMap((message) => (message.type === 'txs' ? message.txs : []));

describe('standalone relay and a React Native-like agent', () => {
  it('streams transactions to a panel and replays a trace in the app', async () => {
    expect(typeof globals.performance).toBe('undefined');
    const agent = new Agent({ name: 'rn-app' });
    const transport = createWebSocketTransport({
      url: agentUrl(),
      WebSocket: WebSocketPolyfill,
      retry: 100,
    });
    agent.connect(transport);

    const itemAdded = createEvent<number>({ name: 'addItem' });
    const fetchPriceFx = createEffect({
      name: 'fetchPriceFx',
      sid: 'fetchPriceFx',
      handler: async (item: number) => item * 100,
    });
    const $items = createStore<number[]>([], { name: '$items', sid: 'items' }).on(
      itemAdded,
      (items, item) => [...items, item],
    );
    const $total = createStore(0, { name: '$total', sid: 'total' }).on(
      fetchPriceFx.doneData,
      (total, price) => total + price,
    );
    sample({ clock: itemAdded, target: fetchPriceFx });
    // `name` comes with the upstream effector PR 3: released typings lack it
    const forkConfig: { name: string; values?: [] } = { name: 'app' };
    const scope = fork(forkConfig);
    // the agent types a scope by the internal fields it reads, effector's public Scope is opaque
    const agentScope = scope as unknown as Parameters<Agent['registerScope']>[0];
    agent.registerScope(agentScope, { name: 'app', switcher: () => {} });

    const { panel, inbox } = await openPanelSocket();
    await waitUntil(() => inbox.some((message) => message.type === 'hello'));
    panel.send(JSON.stringify({ type: 'connect', locale: 'en' }));

    await allSettled(itemAdded, { scope, params: 2 });
    await allSettled(itemAdded, { scope, params: 3 });
    expect(scope.getState($total)).toBe(500);
    await waitUntil(() => collectTransactions(inbox).length >= 4);
    const transactions = collectTransactions(inbox);
    expect(transactions.some((transaction) => transaction.settle?.status === 'done')).toBe(true);

    // export over the socket, then replay: effect results come from the trace
    panel.send(JSON.stringify({ type: 'export', requestId: 'x', scopeId: null }));
    await waitUntil(() => inbox.some((message) => message.type === 'trace'));
    const traceMessage = inbox.find((message) => message.type === 'trace');
    if (traceMessage?.type !== 'trace') throw new Error('no trace message');
    const { trace } = traceMessage;
    expect(trace.steps.map((step) => step.unit)).toHaveLength(2);
    let realCallCount = 0;
    fetchPriceFx.use(async (item) => {
      realCallCount += 1;
      return item;
    });
    panel.send(JSON.stringify({ type: 'replay', requestId: 'r', trace, mode: 'instant' }));
    await waitUntil(() =>
      inbox.some((message) => message.type === 'result' && message.requestId === 'r'),
    );
    expect(realCallCount).toBe(0);
    const { liveId } = agent.scopes;
    if (!liveId) throw new Error('no live scope');
    const liveScope = agent.scopes.get(liveId) as unknown as Scope;
    expect(liveScope.getState($items)).toEqual([2, 3]);
    expect(liveScope.getState($total)).toBe(500);

    panel.close();
    transport.close();
  });

  it('a panel in auto mode follows a restarted agent', async () => {
    const { panel, inbox } = await openPanelSocket();
    const hasHelloFrom = (appName: string) =>
      inbox.some((message) => message.type === 'hello' && message.info.app.name === appName);

    const firstAgent = new Agent({ name: 'first' });
    const firstTransport = createWebSocketTransport({
      url: agentUrl(),
      WebSocket: WebSocketPolyfill,
    });
    firstAgent.connect(firstTransport);
    await waitUntil(() => hasHelloFrom('first'));
    firstTransport.close();

    const secondAgent = new Agent({ name: 'second' });
    const secondTransport = createWebSocketTransport({
      url: agentUrl(),
      WebSocket: WebSocketPolyfill,
    });
    secondAgent.connect(secondTransport);
    await waitUntil(() => hasHelloFrom('second'));
    expect(inbox.some((message) => message.type === 'reset')).toBe(true);
    panel.close();
    secondTransport.close();
  });
});
