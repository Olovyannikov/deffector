/**
 * Content script (isolated world, document_start). Relays between the page's
 * agent (window.postMessage) and the background service worker (runtime port).
 * It opens the port only once the page has an agent, so ordinary pages cost nothing.
 */
import {
  AGENT_SOURCE,
  PANEL_SOURCE,
  PROTOCOL_VERSION,
  type AgentMessage,
  type Envelope,
  type PanelCommand,
} from '@deffector/protocol';

/** The script is injected again into open pages when access to a site is granted: run once. */
const contentScriptMarker = globalThis as typeof globalThis & {
  deffectorContentScriptLoaded?: true;
};

let backgroundPort: chrome.runtime.Port | null = null;

function ensureBackgroundPort(): chrome.runtime.Port | null {
  if (backgroundPort) return backgroundPort;
  let port: chrome.runtime.Port;
  try {
    port = chrome.runtime.connect({ name: 'deffector-content' });
  } catch {
    // extension reloaded or updated: this content script is orphaned
    return null;
  }
  port.onMessage.addListener((command: PanelCommand) => {
    const envelope: Envelope<PanelCommand> = {
      source: PANEL_SOURCE,
      v: PROTOCOL_VERSION,
      payload: command,
    };
    window.postMessage(envelope, '*');
  });
  // the service worker was stopped: the next agent message or a wake-up reopens the port
  port.onDisconnect.addListener(() => {
    backgroundPort = null;
  });
  backgroundPort = port;
  return port;
}

function isAgentEnvelope(data: unknown): data is Envelope<AgentMessage> {
  const candidate = data as Partial<Envelope<AgentMessage>> | null;
  return !!candidate && candidate.source === AGENT_SOURCE && !!candidate.payload;
}

function listen() {
  window.addEventListener('message', (event) => {
    if (event.source !== window || !isAgentEnvelope(event.data)) return;
    const port = ensureBackgroundPort();
    try {
      port?.postMessage(event.data.payload);
    } catch {
      backgroundPort = null;
    }
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request?.deffector === 'wake') ensureBackgroundPort();
  });
}

if (!contentScriptMarker.deffectorContentScriptLoaded) {
  contentScriptMarker.deffectorContentScriptLoaded = true;
  listen();
}
