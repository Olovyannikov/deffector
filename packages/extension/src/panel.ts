import { mountPanel } from '@deffector/panel';
import type { AgentMessage, PanelCommand, PanelTransport } from '@deffector/protocol';

/**
 * Panel page. Inside DevTools the inspected tab comes from chrome.devtools;
 * tests and the "open in a tab" mode pass it as ?tabId=.
 */
const query = new URLSearchParams(window.location.search);
const tabId = Number(query.get('tabId') ?? chrome.devtools?.inspectedWindow?.tabId);

const RECONNECT_DELAY_MS = 100;
/** Messages reset the service worker idle timer (30 s), so a quiet panel does not lose its port. */
const KEEP_ALIVE_INTERVAL_MS = 20_000;

/** A transport over a runtime port to the background worker that survives worker restarts. */
function createPortTransport(): PanelTransport {
  const listeners = new Set<(message: AgentMessage) => void>();
  let port: chrome.runtime.Port | null = null;
  let lastConnect: PanelCommand | null = null;

  const trySend = (command: PanelCommand) => {
    try {
      port?.postMessage(command);
    } catch {
      /* reconnecting */
    }
  };

  const open = () => {
    port = chrome.runtime.connect({ name: `deffector-panel:${tabId}` });
    port.onMessage.addListener((message: AgentMessage) => {
      for (const listener of listeners) listener(message);
    });
    port.onDisconnect.addListener(() => {
      port = null;
      // service worker restarted: reconnect and ask for everything again
      setTimeout(() => {
        open();
        if (lastConnect) port?.postMessage(lastConnect);
      }, RECONNECT_DELAY_MS);
    });
  };

  open();
  setInterval(() => trySend({ type: 'ping' }), KEEP_ALIVE_INTERVAL_MS);
  return {
    send(command) {
      if (command.type === 'connect') lastConnect = command;
      trySend(command);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function detectTheme(): 'dark' | 'light' {
  const requested = query.get('theme');
  if (requested === 'dark' || requested === 'light') return requested;
  const devtoolsTheme = chrome.devtools?.panels?.themeName;
  if (devtoolsTheme) return devtoolsTheme === 'dark' ? 'dark' : 'light';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

const locale = query.get('lang');
const theme = detectTheme();
document.documentElement.style.background = theme === 'dark' ? '#1F1F1F' : '#FFFFFF';
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('panel.html has no #root element');
const panel = mountPanel(rootElement, {
  transport: createPortTransport(),
  theme,
  locale: locale === 'ru' || locale === 'en' ? locale : undefined,
  density: query.get('density') === 'comfortable' ? 'comfortable' : 'compact',
});

// file links in the panel open the Sources panel at the line
if (typeof chrome.devtools?.panels?.openResource === 'function') {
  panel.store.opener = (url, line) =>
    chrome.devtools.panels.openResource(url, Math.max(0, (line ?? 1) - 1), () => {});
}

// for e2e tests and debugging the panel itself
(window as Window & { __deffectorPanel?: typeof panel }).__deffectorPanel = panel;
