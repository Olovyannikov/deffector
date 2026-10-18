# @deffector/agent

The part of [deffector](https://mxmvshnvsk.github.io/deffector/) — DevTools for [effector](https://effector.dev) — that runs inside your app. It records every user action as one transaction and lets the panel travel through time, inject state, override effects and replay traces.

The panel is the deffector browser extension (Chrome, Edge, Firefox) or, outside a browser tab, [`@deffector/standalone`](https://www.npmjs.com/package/@deffector/standalone).

```sh
npm install @deffector/agent
```

## Requirements

- **effector** 22.6+ (tested with 23.4.4 and 22.8.6)
- **React** 16.8+ with effector-react 22+, **Vue** 3.0+ with effector-vue 22+, **Solid** 1.3+ with effector-solid 0.22+ — only for the framework you use
- **Next.js** 13.4+ (App Router, `@effector/next`), tested with 15.5
- **Browser** with the extension: Chrome or Edge 116+, Firefox 140+
- **Node** 18+ for the standalone app; 22+ for the agent in a Node process (older: pass `WebSocket` from `ws`)
- **TypeScript** 5.0+ with `moduleResolution` `"bundler"`, `"node16"` or `"nodenext"`
- **Bundler** that reads the `exports` field (Vite, webpack 5, Next.js, esbuild, Rollup); Parcel 2 needs `"@parcel/resolver-default": { "packageExports": true }`

Details: [Installation → Requirements](https://mxmvshnvsk.github.io/deffector/guide/installation#requirements).

## Use it

Import the agent first, before any module that creates effector units:

```ts
// main.ts
import '@deffector/agent';
```

Render the app through a provider deffector can switch (time travel and replay render another scope):

```tsx
// React
import { DeffectorProvider } from '@deffector/agent/react'; // hooks from effector-react/scope: '@deffector/agent/react-scope'
<DeffectorProvider value={scope} name="client">
  <App />
</DeffectorProvider>;

// Vue
import { withDeffector } from '@deffector/agent/vue';
createApp(withDeffector(App, { scope, name: 'client' })).mount('#app');

// Solid (compiled by vite-plugin-solid or babel-preset-solid)
import { DeffectorProvider } from '@deffector/agent/solid'; // primitives from effector-solid/scope: '@deffector/agent/solid-scope'
<DeffectorProvider value={scope} name="client">
  <App />
</DeffectorProvider>;
```

Open DevTools → **deffector**.

Node, SSR and React Native connect to the standalone app over a WebSocket:

```ts
import { attachDeffectorNode, registerScope } from '@deffector/agent/node';
attachDeffectorNode({ name: 'my-server' });
registerScope(requestScope, { name: `request ${id}` });
```

## Production

Every entry resolves to a no-op through the `production` export condition (Vite, webpack and Next.js set it in production builds), so the agent never reaches your users.

## Documentation

[mxmvshnvsk.github.io/deffector](https://mxmvshnvsk.github.io/deffector/) — installation, frameworks, every panel tab, configuration ([English](https://mxmvshnvsk.github.io/deffector/), [русский](https://mxmvshnvsk.github.io/deffector/ru/)).

MIT © [Maxim Vishnevsky](https://github.com/mxmvshnvsk)
