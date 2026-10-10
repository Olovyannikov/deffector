// deffector standalone server: serves the panel UI and relays messages between
// agents (ws /agent — SSR servers, Node scripts, React Native) and panels (ws /panel).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket, WebSocketServer } from 'ws';

const PUBLIC_DIRECTORY = fileURLToPath(new URL('./dist/public/', import.meta.url));
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json',
};
/** Traces and big state snapshots travel as one message. */
const MAX_MESSAGE_BYTES = 64 * 1024 * 1024;
/** A panel that has not picked an agent follows the most recently connected one. */
const AUTO = 'auto';

/**
 * @typedef {object} AgentConnection
 * @property {WebSocket} ws
 * @property {any} hello the `info` of the agent's last `hello` message
 * @property {number} since Date.now() when the agent connected
 * @property {Set<PanelConnection>} panels
 */
/**
 * @typedef {object} PanelConnection
 * @property {WebSocket} ws
 * @property {string} requestedAgentId an agent id or `auto`
 * @property {string | null} agentId the agent the panel is paired with
 */

let nextAgentNumber = 1;

function sendJson(ws, message) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

/** Agents and panels send JSON text; only `hello` and `select` are parsed, the rest is relayed. */
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Pairs every panel with an agent and forwards messages between them. */
function createRelay(log) {
  /** @type {Map<string, AgentConnection>} */
  const agents = new Map();
  /** @type {Set<PanelConnection>} */
  const panels = new Set();

  /** the agents the standalone page offers in its selector */
  const listTargets = () =>
    [...agents.entries()].map(([id, agent]) => ({
      id,
      name: agent.hello?.app?.name ?? 'agent',
      url: agent.hello?.app?.url ?? '',
      effector: agent.hello?.effector?.version ?? '',
      since: agent.since,
      panels: agent.panels.size,
    }));

  const findNewestAgentId = () => {
    let newestId = null;
    let newestSince = -Infinity;
    for (const [id, agent] of agents) {
      if (agent.since > newestSince) {
        newestId = id;
        newestSince = agent.since;
      }
    }
    return newestId;
  };

  /** the agent a panel should show: the one it asked for, or the newest one in auto mode */
  const chooseAgentId = (connection) => {
    if (connection.requestedAgentId === AUTO) return findNewestAgentId();
    return agents.has(connection.requestedAgentId) ? connection.requestedAgentId : null;
  };

  const detachPanel = (connection, agent) => {
    agent.panels.delete(connection);
    // no one is watching: let the agent stop sending data
    if (!agent.panels.size) sendJson(agent.ws, { type: 'disconnect' });
  };

  const pair = (connection) => {
    const agentId = chooseAgentId(connection);
    if (agentId === connection.agentId) return;
    const previousAgent = connection.agentId && agents.get(connection.agentId);
    if (previousAgent) detachPanel(connection, previousAgent);
    connection.agentId = agentId;
    sendJson(connection.ws, { type: 'reset' });
    const agent = agentId && agents.get(agentId);
    if (!agent) return;
    agent.panels.add(connection);
    // the panel asks for everything when it sees an agent that is not listening
    if (agent.hello)
      sendJson(connection.ws, { type: 'hello', info: agent.hello, listening: false });
    else sendJson(agent.ws, { type: 'ping' });
  };

  const acceptAgent = (ws) => {
    const id = `a${nextAgentNumber}`;
    nextAgentNumber += 1;
    /** @type {AgentConnection} */
    const agent = { ws, hello: null, since: Date.now(), panels: new Set() };
    agents.set(id, agent);
    sendJson(ws, { type: 'ping' });
    ws.on('message', (data) => {
      const text = data.toString();
      if (text.startsWith('{"type":"hello"')) {
        const isFirstHello = !agent.hello;
        const hello = parseJson(text);
        if (hello) agent.hello = hello.info;
        if (isFirstHello && agent.hello) {
          log(
            `[deffector] agent connected: ${agent.hello.app?.name} (effector ${agent.hello.effector?.version})`,
          );
        }
      }
      for (const panel of agent.panels)
        if (panel.ws.readyState === WebSocket.OPEN) panel.ws.send(text);
    });
    ws.on('close', () => {
      agents.delete(id);
      log(`[deffector] agent disconnected: ${agent.hello?.app?.name ?? id}`);
      for (const panel of agent.panels) {
        panel.agentId = null;
        pair(panel);
      }
    });
    // panels in auto mode follow the newest agent (a restarted dev server)
    for (const panel of panels) if (panel.requestedAgentId === AUTO && !panel.agentId) pair(panel);
  };

  const acceptPanel = (ws, requestedAgentId) => {
    /** @type {PanelConnection} */
    const connection = { ws, requestedAgentId, agentId: null };
    panels.add(connection);
    pair(connection);
    ws.on('message', (data) => {
      const text = data.toString();
      if (text.startsWith('{"type":"select"')) {
        const select = parseJson(text);
        if (select) connection.requestedAgentId = select.agent || AUTO;
        pair(connection);
        return;
      }
      const agent = connection.agentId && agents.get(connection.agentId);
      if (agent && agent.ws.readyState === WebSocket.OPEN) agent.ws.send(text);
    });
    ws.on('close', () => {
      panels.delete(connection);
      const agent = connection.agentId && agents.get(connection.agentId);
      if (agent) detachPanel(connection, agent);
    });
  };

  return { agents, listTargets, acceptAgent, acceptPanel };
}

/** Request paths are resolved inside PUBLIC_DIRECTORY only: leading `../` segments are dropped. */
function resolvePublicPath(pathname) {
  return normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[/\\])+/, '');
}

async function serveStatic(pathname, response) {
  const path = resolvePublicPath(pathname);
  try {
    const body = await readFile(join(PUBLIC_DIRECTORY, path));
    response.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(path)] ?? 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end('not found');
  }
}

/** `request.url` is only a path: a base is needed to parse it. */
const parseRequestUrl = (request) => new URL(request.url ?? '/', 'http://localhost');

export function startServer({ port = 8686, host = '127.0.0.1', log = console.log } = {}) {
  const relay = createRelay(log);

  const server = createServer(async (request, response) => {
    const { pathname } = parseRequestUrl(request);
    if (pathname !== '/targets.json') {
      await serveStatic(pathname, response);
      return;
    }
    response.writeHead(200, {
      'content-type': CONTENT_TYPES['.json'],
      'cache-control': 'no-store',
    });
    response.end(JSON.stringify(relay.listTargets()));
  });

  const webSocketServer = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
  server.on('upgrade', (request, socket, head) => {
    const url = parseRequestUrl(request);
    if (url.pathname !== '/agent' && url.pathname !== '/panel') {
      socket.destroy();
      return;
    }
    webSocketServer.handleUpgrade(request, socket, head, (ws) => {
      if (url.pathname === '/agent') relay.acceptAgent(ws);
      else relay.acceptPanel(ws, url.searchParams.get('agent') || AUTO);
    });
  });

  const close = () =>
    new Promise((resolve) => {
      for (const client of webSocketServer.clients) client.terminate();
      server.close(() => resolve());
    });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const publicHost = host === '0.0.0.0' ? 'localhost' : host;
      resolve({
        port: address.port,
        url: `http://${publicHost}:${address.port}`,
        agents: relay.agents,
        close,
      });
    });
  });
}
