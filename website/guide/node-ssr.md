# Node, SSR, React Native

Code that does not run in a browser tab has no DevTools to attach to. For it deffector has a
**standalone app**: a small server that serves the same panel in an ordinary browser tab and relays
messages between your process and that tab over a WebSocket.

<Architecture />

## Start the standalone app

```sh
npx @deffector/standalone            # panel on http://localhost:8686
```

From a clone of the repository: `npm run standalone`. Inside the repository `npx` finds the local
workspace package first; to run the published one there, use `npx @deffector/standalone@latest`.

| Flag / variable                  | Default     | Meaning                                                              |
| -------------------------------- | ----------- | -------------------------------------------------------------------- |
| `--port <n>` or `DEFFECTOR_PORT` | `8686`      | HTTP and WebSocket port                                              |
| `--host <addr>`                  | `127.0.0.1` | interface to listen on; `0.0.0.0` to accept other devices on the LAN |
| `--help`                         |             | short usage                                                          |

The server answers on these paths:

- `http://localhost:8686/` — the panel;
- `ws://localhost:8686/agent` — agents connect here;
- `ws://localhost:8686/panel` — panels connect here (the page at `/` does it for you);
- `http://localhost:8686/targets.json` — the list of connected agents.

It prints a line when an agent connects or disconnects. Several agents can be connected at once (a dev
server, a script, a phone): the **Agent** selector above the panel picks one. Its default,
“auto: the newest one”, follows the most recently connected agent, so a restarted dev server is picked
up by itself.

The panel page takes a few URL parameters: `?agent=<id>` (an id from `targets.json`), `?lang=ru` or
`?lang=en`, `?theme=light` or `?theme=dark` (by default it follows the system theme).

## Connect a Node process

```ts
// before the modules that create units
import { attachDeffectorNode, registerScope } from '@deffector/agent/node';

attachDeffectorNode({ name: 'my-server' });
```

`attachDeffectorNode` creates a WebSocket transport to the standalone app and configures the agent. It
accepts every [agent option](/reference/configuration#agent-options) plus:

| Option             | Default                                               | Meaning                                                                        |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| `url`              | `DEFFECTOR_URL` env, else `ws://localhost:8686/agent` | address of the standalone app                                                  |
| `WebSocket`        | the global `WebSocket`                                | an implementation for runtimes without one (for example `WebSocket` from `ws`) |
| `retry`            | `1500`                                                | reconnect delay, ms; the transport reconnects forever                          |
| `onStatus`         | —                                                     | `(status: 'open' \| 'closed') => void`, for logging                            |
| `skipInProduction` | `true`                                                | do nothing when `NODE_ENV=production`                                          |

It returns `{ detach() }`, which closes the socket. The transport's timers are `unref`'d, so it never
keeps a process alive. While the socket is down, messages are dropped; when the panel comes back it
asks for everything again.

Node 22 has a global `WebSocket`. On older versions pass one:

```ts
import WebSocket from 'ws';

attachDeffectorNode({ name: 'my-server', WebSocket });
```

### A scope per request

On a server every request usually forks its own scope. Register it to see a readable name in the
scope selector:

```ts
import { createServer } from 'node:http';
import { allSettled, fork, serialize } from 'effector';

let n = 0;

createServer(async (req, res) => {
  const scope = fork();
  registerScope(scope, { name: `request #${++n} ${req.url}` });
  await allSettled(pageStarted, { scope, params: req.url });
  res.end(render(serialize(scope)));
});
```

Every request then shows up as its own scope; the **scope** selector in the toolbar filters the log by
one of them. Keep `maxTransactions` modest on a busy server (the demos use `2000`): history is kept in
memory.

::: tip Time travel on the server
Time travel on the server writes values into the request scope in place: there is no UI that could
render a forked copy. Inspecting, editing, overriding effects and exporting traces work as usual.
:::

## Next.js server

In `instrumentation.ts`, only for the Node.js runtime:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { attachDeffectorNode } = await import('@deffector/agent/node');
    attachDeffectorNode({ name: 'next (server)', maxTransactions: 2000 });
  }
}
```

The browser side goes to the extension as usual — see
[Next.js App Router](/guide/frameworks#next-js-app-router).

## React Native

The device or emulator connects to the standalone app on your computer, so the app must listen on the
network and the agent must use your computer's address:

```sh
npx @deffector/standalone --host 0.0.0.0
```

```ts
// index.js — before the modules that create units
import { attachDeffectorNode } from '@deffector/agent/node';

attachDeffectorNode({ name: 'app', url: 'ws://192.168.1.10:8686/agent' });
```

React Native has a global `WebSocket`, so nothing else is needed. In release builds
`attachDeffectorNode` does nothing (`NODE_ENV=production`). The module itself is still imported; if your
bundler does not apply the `production` export condition and you want no agent code at all in a
release, load it behind `__DEV__`:

```ts
if (__DEV__) {
  require('@deffector/agent/node').attachDeffectorNode({
    name: 'app',
    url: 'ws://192.168.1.10:8686/agent',
  });
}
```

Render the app with `DeffectorProvider` from `@deffector/agent/react`, as in a web app, so that time
travel and replay can swap the scope.

## A browser app without the extension

The agent can talk to the extension and to the standalone app at once, and its WebSocket works in a
browser too. Connect a browser app to the standalone app when the extension is not available — Safari,
a phone browser, a WebView or Electron — or to keep the panel in a separate window:

```ts
import '@deffector/agent';
import { attachDeffectorNode } from '@deffector/agent/node';

attachDeffectorNode({ name: 'web app' }); // ws://localhost:8686/agent
```

Despite its name, `attachDeffectorNode` only opens a WebSocket to the standalone app. If the extension
is installed as well, both panels show the same agent and either can control it. For a phone on the
network use `url: 'ws://<your computer's IP>:8686/agent'` and start the server with `--host 0.0.0.0`.

## Scripts and tests

The same call works in any Node script, including a test run: start the standalone app, call
`attachDeffectorNode()` in a setup file, and watch the transactions of the test in the panel. Remember
`skipInProduction`: if your test runner sets `NODE_ENV=production`, pass `skipInProduction: false`.

## Try it

```sh
npm run standalone            # terminal 1: panel on http://localhost:8686
npm run dev:node-ssr          # terminal 2: server on http://localhost:5176
```

Open http://localhost:5176 a few times (try `/?email=taken@example.com`) and look at the scopes in
http://localhost:8686. See [Demos](/reference/demos).

The React demo connects to the standalone app too when opened with `?standalone`:

```sh
npx @deffector/standalone@latest   # terminal 1: panel on http://localhost:8686
npm run dev:react                  # terminal 2: open http://localhost:5171/?standalone
```
