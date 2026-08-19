import type { AgentMessage, AgentTransport, PanelCommand } from '@deffector/protocol';
import { unrefTimer } from '../platform';

export interface WebSocketTransportOptions {
  /** ws://host:port of `npx @deffector/standalone`, default ws://localhost:8686/agent */
  url?: string;
  /** WebSocket implementation for runtimes without a global one (Node < 22, React Native polyfills) */
  WebSocket?: typeof WebSocket;
  /** reconnect delay, ms */
  retry?: number;
  /** called when the socket state changes, for logging */
  onStatus?: (status: 'open' | 'closed') => void;
}

const DEFAULT_URL = 'ws://localhost:8686/agent';
const DEFAULT_RETRY_MS = 1500;
const OPEN = 1;

function parseCommand(data: unknown): PanelCommand | undefined {
  try {
    return JSON.parse(typeof data === 'string' ? data : String(data));
  } catch {
    return undefined;
  }
}

/** One socket at a time, reopened with a fixed delay until closed for good. */
class ReconnectingSocket {
  private socket: WebSocket | null = null;

  private isClosed = false;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  readonly listeners = new Set<(command: PanelCommand) => void>();

  constructor(
    private readonly url: string,
    private readonly SocketClass: typeof WebSocket,
    private readonly options: WebSocketTransportOptions,
  ) {}

  open() {
    if (this.isClosed) return;
    let socket: WebSocket;
    try {
      socket = new this.SocketClass(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = () => this.options.onStatus?.('open');
    socket.onmessage = (event: MessageEvent) => {
      const command = parseCommand(event.data);
      if (command) this.listeners.forEach((listener) => listener(command));
    };
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      this.options.onStatus?.('closed');
      // the panel is gone with the socket: stop streaming until it comes back
      this.listeners.forEach((listener) => listener({ type: 'disconnect' }));
      this.scheduleReconnect();
    };
    socket.onerror = () => {
      /* onclose follows */
    };
  }

  private scheduleReconnect() {
    if (this.isClosed || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, this.options.retry ?? DEFAULT_RETRY_MS);
    unrefTimer(this.reconnectTimer);
  }

  send(message: AgentMessage) {
    if (!this.socket || this.socket.readyState !== OPEN) return;
    try {
      this.socket.send(JSON.stringify(message));
    } catch {
      /* closing */
    }
  }

  close() {
    this.isClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
  }
}

/**
 * Agent ⇄ standalone app over a WebSocket. Reconnects forever with a fixed
 * delay; while disconnected, messages are dropped (the panel asks for
 * everything with `connect` when it comes back). Timers are unref'd in Node
 * so the transport never keeps a process alive.
 */
export function createWebSocketTransport(
  options: WebSocketTransportOptions = {},
): AgentTransport & { close(): void } {
  const SocketClass =
    options.WebSocket || (globalThis as { WebSocket?: typeof WebSocket }).WebSocket;
  if (!SocketClass) {
    throw new Error(
      '[deffector] no WebSocket implementation: pass options.WebSocket (e.g. from the "ws" package)',
    );
  }
  const connection = new ReconnectingSocket(options.url || DEFAULT_URL, SocketClass, options);
  connection.open();
  return {
    send(message: AgentMessage) {
      connection.send(message);
    },
    subscribe(listener) {
      connection.listeners.add(listener);
      return () => connection.listeners.delete(listener);
    },
    close() {
      connection.close();
    },
  };
}
