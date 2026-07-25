import type { AgentMessage } from './agentMessages';
import type { PanelCommand } from './panelCommands';

export interface Transport<In, Out> {
  send(message: Out): void;
  subscribe(listener: (message: In) => void): () => void;
}

export type AgentTransport = Transport<PanelCommand, AgentMessage>;
export type PanelTransport = Transport<AgentMessage, PanelCommand>;

/** A deep copy, like postMessage makes: a receiver must never share objects with the sender. */
function cloneMessage<T>(message: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(message)
    : JSON.parse(JSON.stringify(message));
}

/** Delivers on a microtask, like a real channel: listeners never run inside `send`. */
function deliverLater<T>(listeners: Set<(message: T) => void>, message: T): void {
  const copy = cloneMessage(message);
  queueMicrotask(() => {
    for (const listener of listeners) listener(copy);
  });
}

/** Two connected in-memory ends: for tests, the standalone harness and same-page overlay mode. */
export function createMemoryTransportPair(): { agent: AgentTransport; panel: PanelTransport } {
  const panelListeners = new Set<(message: AgentMessage) => void>();
  const agentListeners = new Set<(message: PanelCommand) => void>();
  return {
    agent: {
      send: (message) => deliverLater(panelListeners, message),
      subscribe: (listener) => {
        agentListeners.add(listener);
        return () => agentListeners.delete(listener);
      },
    },
    panel: {
      send: (command) => deliverLater(agentListeners, command),
      subscribe: (listener) => {
        panelListeners.add(listener);
        return () => panelListeners.delete(listener);
      },
    },
  };
}
