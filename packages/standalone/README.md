# @deffector/standalone

The [deffector](https://mxmvshnvsk.github.io/deffector/) panel — DevTools for [effector](https://effector.dev) — as a standalone app, for code that does not run in a browser tab: SSR servers, Node scripts, tests and React Native.

```sh
npx @deffector/standalone            # panel on http://localhost:8686
npx @deffector/standalone --port 9000 --host 0.0.0.0
```

It serves the panel and relays agents over a WebSocket (`ws://localhost:8686/agent`). In your app, with [`@deffector/agent`](https://www.npmjs.com/package/@deffector/agent):

```ts
import { attachDeffectorNode, registerScope } from '@deffector/agent/node';

attachDeffectorNode({ name: 'my-server' });
registerScope(requestScope, { name: `request ${id}` }); // a scope per request

// React Native: the device reaches your computer by its address
attachDeffectorNode({ name: 'app', url: 'ws://192.168.1.10:8686/agent' });
```

For a device on the network start the server with `--host 0.0.0.0`; by default it listens on 127.0.0.1 only.

Requirements: Node 18+ for this app. The agent in a Node process needs Node 22+ (a global `WebSocket`), or pass one from `ws`: `attachDeffectorNode({ WebSocket })`. More: [Installation → Requirements](https://mxmvshnvsk.github.io/deffector/guide/installation#requirements).

Documentation: [Node, SSR, React Native](https://mxmvshnvsk.github.io/deffector/guide/node-ssr).

MIT © [Maxim Vishnevsky](https://github.com/mxmvshnvsk)
