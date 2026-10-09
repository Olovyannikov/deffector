/**
 * Service worker: routes messages between a page (content script port) and its
 * DevTools panel (panel port), keyed by tabId. It keeps no state that matters:
 * if Chrome stops the worker, both sides reconnect and the panel asks for
 * everything again with `connect`.
 */
import type { AgentMessage, HelloInfo, PanelCommand } from '@deffector/protocol';

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
}

const tabs = new Map<number, TabConnection>();

function getTabConnection(tabId: number): TabConnection {
  let connection = tabs.get(tabId);
  if (!connection) {
    connection = { content: null, panel: null, queue: [], hello: null };
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
  port.onMessage.addListener((command: PanelCommand) => sendToContent(tabId, connection, command));
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

// the popup asks what is on the current tab
chrome.runtime.onMessage.addListener((request, _sender, reply) => {
  if (request?.deffector === 'status' && typeof request.tabId === 'number') {
    const connection = tabs.get(request.tabId);
    reply({ hello: connection?.hello ?? null, panel: !!connection?.panel });
  }
});
