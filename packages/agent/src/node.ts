/**
 * @deffector/agent/node — for code that runs outside a browser tab:
 * SSR servers, Node scripts, tests, React Native. Connects the agent to the
 * standalone app (`npx @deffector/standalone`) over a WebSocket.
 *
 *   import { attachDeffectorNode } from '@deffector/agent/node'
 *   attachDeffectorNode({ name: 'ssr' })
 *
 * Import it before the modules that create units. On the server every request
 * usually forks its own scope: register it with registerScope(scope, { name })
 * to see readable names, and keep `maxTransactions` modest.
 */
import { attachDeffector, getAgent, registerModel, registerScope, type AgentOptions } from '.';
import { createWebSocketTransport, type WebSocketTransportOptions } from './transport';

export interface NodeAttachOptions extends AgentOptions, WebSocketTransportOptions {
  /** do nothing when NODE_ENV=production (default true) */
  skipInProduction?: boolean;
}

type Environment = Record<string, string | undefined>;

function processEnvironment(): Environment | undefined {
  return (globalThis as { process?: { env?: Environment } }).process?.env;
}

export function attachDeffectorNode(options: NodeAttachOptions = {}) {
  const environment = processEnvironment();
  if ((options.skipInProduction ?? true) && environment?.NODE_ENV === 'production') {
    return { detach() {} };
  }
  const transport = createWebSocketTransport({
    ...options,
    url: options.url || environment?.DEFFECTOR_URL,
  });
  const { detach } = attachDeffector({ ...options, transport });
  return {
    detach() {
      detach();
      transport.close();
    },
  };
}

export { getAgent, registerModel, registerScope, createWebSocketTransport };
