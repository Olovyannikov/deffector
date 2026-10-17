/**
 * Service worker: routes messages between a page (content script port) and its
 * DevTools panel (panel port), keyed by tabId. It keeps no state that matters:
 * if Chrome stops the worker, both sides reconnect and the panel asks for
 * everything again with `connect`.
 */
import type { AgentMessage, HelloInfo, PanelCommand } from '@deffector/protocol';
import {
  hasSiteAccess,
  injectIntoOpenTabs,
  openAccessRequest,
  syncGrantedSites,
} from './site-access';

const CONTENT_PORT_NAME = 'deffector-content';
/** Panel ports are named `deffector-panel:<tabId>`. */
const PANEL_PORT_PREFIX = 'deffector-panel:';
/** Commands kept for a page without a content port; older ones are dropped. */
const MAX_QUEUED_COMMANDS = 50;

interface TabConnection {
  content: chrome.runtime.Port | null;
  panel: chrome.runtime.Port | null;
  /** commands sent by the panel while the page had no live content port */
  queue: PanelCommand[];
  hello: HelloInfo | null;
  /** the panel's last `connect`, sent again when a page gets the content script late */
  lastConnect: PanelCommand | null;
}

const tabs = new Map<number, TabConnection>();

function getTabConnection(tabId: number): TabConnection {
  let connection = tabs.get(tabId);
  if (!connection) {
    connection = { content: null, panel: null, queue: [], hello: null, lastConnect: null };
    tabs.set(tabId, connection);
  }
  return connection;
}

function ignoreError() {}

/** The toolbar icon is coloured while the tab has an agent. */
function updateActionIcon(tabId: number, hello: HelloInfo | null) {
  const path = hello
    ? { 16: 'icons/16.png', 32: 'icons/32.png' }
    : { 16: 'icons/16-off.png', 32: 'icons/32-off.png' };
  const title = hello
    ? `deffector: effector ${hello.effector.version}`
    : 'deffector: no effector agent on this page';
  chrome.action.setIcon({ tabId, path }).catch(ignoreError);
  chrome.action.setTitle({ tabId, title }).catch(ignoreError);
}

function sendToPanel(connection: TabConnection, message: AgentMessage) {
  try {
    connection.panel?.postMessage(message);
  } catch {
    connection.panel = null;
  }
}

function sendToContent(tabId: number, connection: TabConnection, command: PanelCommand) {
  if (connection.content) {
    try {
      connection.content.postMessage(command);
      return;
    } catch {
      connection.content = null;
    }
  }
  if (command.type === 'disconnect') return;
  const { queue } = connection;
  queue.push(command);
  if (queue.length > MAX_QUEUED_COMMANDS) queue.splice(0, queue.length - MAX_QUEUED_COMMANDS);
  // the content script connects lazily: wake it up so it opens its port
  chrome.tabs.sendMessage(tabId, { deffector: 'wake' }).catch(ignoreError);
}

function acceptContentPort(port: chrome.runtime.Port) {
  const tabId = port.sender?.tab?.id;
  // only the top frame has an agent worth showing
  if (tabId === undefined || port.sender?.frameId) {
    port.disconnect();
    return;
  }
  const connection = getTabConnection(tabId);
  connection.content = port;
  for (const command of connection.queue.splice(0)) port.postMessage(command);
  port.onMessage.addListener((message: AgentMessage) => {
    if (message.type === 'hello') {
      const isNewAgent = !connection.hello || connection.hello.instance !== message.info.instance;
      connection.hello = message.info;
      if (isNewAgent) updateActionIcon(tabId, message.info);
    }
    sendToPanel(connection, message);
  });
  port.onDisconnect.addListener(() => {
    if (connection.content !== port) return;
    connection.content = null;
    // page navigated or reloaded: the panel goes back to "waiting"
    connection.hello = null;
    sendToPanel(connection, { type: 'reset' });
    updateActionIcon(tabId, null);
  });
}

function acceptPanelPort(port: chrome.runtime.Port) {
  const tabId = Number(port.name.slice(PANEL_PORT_PREFIX.length));
  if (!Number.isFinite(tabId)) {
    port.disconnect();
    return;
  }
  const connection = getTabConnection(tabId);
  connection.panel = port;
  port.onMessage.addListener((command: PanelCommand) => {
    if (command.type === 'connect') connection.lastConnect = command;
    sendToContent(tabId, connection, command);
  });
  port.onDisconnect.addListener(() => {
    if (connection.panel !== port) return;
    connection.panel = null;
    // DevTools closed: let the agent stop sending data
    if (connection.content) sendToContent(tabId, connection, { type: 'disconnect' });
  });
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === CONTENT_PORT_NAME) acceptContentPort(port);
  else if (port.name.startsWith(PANEL_PORT_PREFIX)) acceptPanelPort(port);
});

interface LiveTab {
  tabId: number;
  url: string | undefined;
  hello: HelloInfo | null;
}

/** pages with a live agent: used by e2e tests and the "open panel in a tab" mode */
(globalThis as typeof globalThis & { __deffectorTabs: () => LiveTab[] }).__deffectorTabs = () => {
  const liveTabs: LiveTab[] = [];
  for (const [tabId, connection] of tabs) {
    if (connection.content) {
      liveTabs.push({ tabId, url: connection.content.sender?.url, hello: connection.hello });
    }
  }
  return liveTabs;
};

chrome.tabs.onRemoved.addListener((tabId) => tabs.delete(tabId));

/**
 * A page got the content script after it loaded (access was just granted): the agent's first
 * `hello` was lost, so ask it again with the panel's `connect`.
 */
function reconnectLatePage(tabId: number) {
  const connection = getTabConnection(tabId);
  if (connection.panel && connection.lastConnect) {
    sendToContent(tabId, connection, connection.lastConnect);
  } else {
    chrome.tabs.sendMessage(tabId, { deffector: 'wake' }).catch(ignoreError);
  }
}

chrome.permissions.onAdded.addListener(async ({ origins = [] }) => {
  await syncGrantedSites().catch(ignoreError);
  for (const tabId of await injectIntoOpenTabs(origins)) reconnectLatePage(tabId);
});
chrome.permissions.onRemoved.addListener(() => {
  syncGrantedSites().catch(ignoreError);
});
// the registration survives restarts, but permissions may have changed while the worker slept
syncGrantedSites().catch(ignoreError);

interface SiteAccessRequest {
  deffector: 'site-access' | 'request-site-access';
  origin: string;
}

const isSiteAccessRequest = (request: unknown): request is SiteAccessRequest =>
  typeof (request as SiteAccessRequest | null)?.origin === 'string';

chrome.runtime.onMessage.addListener((request, _sender, reply) => {
  // the popup asks what is on the current tab
  if (request?.deffector === 'status' && typeof request.tabId === 'number') {
    const connection = tabs.get(request.tabId);
    reply({ hello: connection?.hello ?? null, panel: !!connection?.panel });
    return false;
  }
  if (!isSiteAccessRequest(request)) return false;
  // the panel: may deffector run on the inspected page's origin?
  if (request.deffector === 'site-access') {
    hasSiteAccess(request.origin).then(
      (granted) => reply({ granted }),
      () => reply({ granted: false }),
    );
    return true; // the reply is asynchronous
  }
  if (request.deffector === 'request-site-access') {
    openAccessRequest(request.origin).catch(ignoreError);
  }
  return false;
});
