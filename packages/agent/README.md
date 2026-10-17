# @deffector/agent

The part of [deffector](https://mxmvshnvsk.github.io/deffector/) — DevTools for [effector](https://effector.dev) — that runs inside your app. It records every user action as one transaction and lets the panel travel through time, inject state, override effects and replay traces.

The panel is the deffector browser extension (Chrome, Edge, Firefox) or, outside a browser tab, [`@deffector/standalone`](https://www.npmjs.com/package/@deffector/standalone).

```sh
npm install @deffector/agent
```

## Use it

Import the agent first, before any module that creates effector units:

```ts
// main.ts
import '@deffector/agent';
```

Render the app through a provider deffector can switch (time travel and replay render another scope):

```tsx
// React
import { DeffectorProvider } from '@deffector/agent/react';
<DeffectorProvider value={scope} name="client">
  <App />
</DeffectorProvider>;

// Vue
import { withDeffector } from '@deffector/agent/vue';
createApp(withDeffector(App, { scope, name: 'client' })).mount('#app');

// Solid (compiled by vite-plugin-solid or babel-preset-solid)
import { DeffectorProvider } from '@deffector/agent/solid';
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
