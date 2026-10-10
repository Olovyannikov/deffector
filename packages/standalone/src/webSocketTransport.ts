import type { AgentMessage, PanelCommand, PanelTransport } from '@deffector/protocol';

const RECONNECT_DELAY_MS = 1000;
/** Keeps proxies between the page and the server from closing an idle socket. */
const KEEP_ALIVE_INTERVAL_MS = 20_000;

export interface StandaloneTransport extends PanelTransport {
  /** Pair the panel with another agent (`auto`: the newest one). */
  select(agentId: string): void;
  /** The agent the panel asked for last: an agent id or `auto`. */
  getSelectedAgentId(): string;
}

function panelSocketUrl(agentId: string): string {
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${window.location.host}/panel?agent=${encodeURIComponent(agentId)}`;
}

/** A transport over the relay's /panel socket that reconnects when the server restarts. */
export function createWebSocketTransport(initialAgentId: string): StandaloneTransport {
  const listeners = new Set<(message: AgentMessage) => void>();
  const notify = (message: AgentMessage) => {
    for (const listener of listeners) listener(message);
  };
  let agentId = initialAgentId;
  let socket: WebSocket | null = null;
  let lastConnect: PanelCommand | null = null;

  const sendIfOpen = (text: string) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(text);
  };

  const open = () => {
    const openedSocket = new WebSocket(panelSocketUrl(agentId));
    socket = openedSocket;
    openedSocket.onmessage = (event) => {
      let message: AgentMessage;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      notify(message);
    };
    // a new socket starts unpaired: repeat `connect` so the agent sends everything again
    openedSocket.onopen = () => {
      if (lastConnect) openedSocket.send(JSON.stringify(lastConnect));
    };
    openedSocket.onclose = () => {
      if (socket === openedSocket) socket = null;
      notify({ type: 'reset' });
      setTimeout(open, RECONNECT_DELAY_MS);
    };
  };

  open();
  setInterval(() => sendIfOpen('{"type":"ping"}'), KEEP_ALIVE_INTERVAL_MS);
  return {
    send(command) {
      if (command.type === 'connect') lastConnect = command;
      sendIfOpen(JSON.stringify(command));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    select(selectedAgentId) {
      agentId = selectedAgentId;
      sendIfOpen(JSON.stringify({ type: 'select', agent: selectedAgentId }));
    },
    getSelectedAgentId: () => agentId,
  };
}
