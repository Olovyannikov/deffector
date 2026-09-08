/**
 * @deffector/agent — import it first, before any module that creates effector units:
 *
 *   import '@deffector/agent'
 *
 * Units created before the import are still found when they run, but without
 * factory/region information. In production builds the package resolves to a no-op.
 */
import type { AgentTransport } from '@deffector/protocol';
import { Agent, type AgentOptions } from './agent';
import type { EffectorScope } from './effector';
import type { ScopeSwitcher } from './scopes';
import { createWindowTransport } from './transport';

/** one agent per page, even when the package is bundled twice */
const GLOBAL_KEY = '__DEFFECTOR_AGENT__';

function createAgent(): Agent {
  const pageGlobals = globalThis as Record<string, unknown>;
  const existing = pageGlobals[GLOBAL_KEY];
  if (existing) return existing as Agent;
  const created = new Agent();
  pageGlobals[GLOBAL_KEY] = created;
  if (typeof window !== 'undefined' && typeof window.postMessage === 'function') {
    created.connect(createWindowTransport(window));
  }
  return created;
}

const agent = createAgent();

export interface AttachOptions extends AgentOptions {
  /** scope(s) to inspect; with a framework adapter use DeffectorProvider instead */
  scope?: EffectorScope | object;
  scopeName?: string;
  /** extra transport, e.g. a websocket to the standalone app (SSR, Node, React Native) */
  transport?: AgentTransport;
}

/** Configure the agent and optionally register a scope. Safe to call more than once. */
export function attachDeffector(options: AttachOptions = {}) {
  agent.configure(options);
  if (options.scope) agent.registerScope(options.scope, { name: options.scopeName });
  const detach = options.transport ? agent.connect(options.transport) : () => {};
  return { agent, detach };
}

/**
 * Give a scope a readable name, and (for adapters) a way to render the app with
 * another scope — that is what time travel and replay use.
 */
export function registerScope(
  scope: EffectorScope | object,
  options: { name?: string; switcher?: ScopeSwitcher } = {},
) {
  return agent.registerScope(scope, options);
}

/**
 * Show the units of a model instance as one group (Stores, Graph): pass the
 * object a factory returned. Objects with the `@@debug` method (patronum#297:
 * `() => ({ name, units })`) are understood too.
 */
export function registerModel(instance: unknown, name?: string): void {
  agent.registerModel(instance, name);
}

export function getAgent(): Agent {
  return agent;
}

export { Agent, createWindowTransport };
export type { AgentOptions, ScopeSwitcher };
