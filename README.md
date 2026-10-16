<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/banner-dark.svg">
    <img alt="deffector — DevTools for effector" src="assets/brand/banner-light.svg" width="760">
  </picture>
</p>

DevTools for [effector](https://effector.dev): every user action as one transaction, time travel through them, your own state injected into any store, and traces that another developer replays to reproduce your bug — like the Elm debugger.

- **Log** — one row per transaction (an event and everything it caused), with the step tree in effector's own order: lanes, filters that returned `false`, stores that got the same value, double recomputations, stale reads, errors in pure functions, calls outside of a scope. A sequence diagram per transaction. Saved filters with colours; filters that stop recording noisy transactions. Notes on steps and `#step=N` links.
- **Time travel** — jump to any transaction. With `fork()` the app renders a forked copy of that moment and the present is untouched; in global mode values are written in place, with a warning. The page is covered while it shows the past, so a click cannot change it.
- **Stores** — current values grouped by file, factory, domain or model; set any value live (logged like `allSettled`) or silently (a new forked scope); presets of a whole form; paste a snapshot `{ sid: value }` and see the diff before applying.
- **Effects** — a network-panel style waterfall with out-of-order responses highlighted; force an effect to stay pending, resolve or reject with a value, add latency, or run your own handler.
- **Graph** — the neighbourhood of a unit or the path of a transaction in execution order; the path from A to B; groups by file, factory, domain or model; operators on edges.
- **Traces** — export the initial state, external calls and effect results as JSON (secrets masked, length kept). Import → compatibility check → replay in a fresh scope without touching the network, opened at the step the author pointed to; or copy it as a vitest test.
- **Health** — calls outside of a scope, units without `sid`, duplicate sids, server values for unknown sids, units created again and again (leaks), cycles in the graph, stale reads, writes to derived stores, derived stores that disagree with their sources, exceptions and what they prevented, a foreign inspector — each with a fix. An infinite loop through events is stopped before it freezes the tab.
- **Ctrl+K** — a command palette over tabs, actions, units and transactions. File links open the Sources panel at the line.

Works with React, Vue, Solid, Next.js (App Router, `@effector/next`), plain Node/SSR, React Native and global mode (no `fork()`), with or without the babel/swc plugin. Chrome, Edge and Firefox. English and Russian UI.

## Use it

```ts
// the very first import of your app
import '@deffector/agent';
```

Then render with a provider deffector can switch (for time travel and replay):

```tsx
// React
import { DeffectorProvider } from '@deffector/agent/react';
<DeffectorProvider value={scope} name="client">
  <App />
</DeffectorProvider>;

// Vue
import { withDeffector } from '@deffector/agent/vue';
createApp(withDeffector(App, { scope, name: 'client' })).mount('#app');

// Solid
import { DeffectorProvider } from '@deffector/agent/solid';
<DeffectorProvider value={scope} name="client">
  <App />
</DeffectorProvider>;
```

Open DevTools → **deffector**. In production builds every entry resolves to a no-op (`production` export condition).

Options (`attachDeffector({ … })` from `@deffector/agent`):

|                               |                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `name`, `build`               | app name and build id written to traces                                                                                      |
| `whileClosed`                 | `'pause'` (default): stop recording 10 s after load without DevTools, resume when the panel opens; `'record'`: always record |
| `hardStop`                    | steps in one synchronous run before an infinite loop is cut (default 100 000, `false` = off)                                 |
| `lockPast`                    | cover the page while it shows the past (default `true`)                                                                      |
| `maxTransactions`, `maxSteps` | history size and recorded steps per transaction                                                                              |

Group the units of a model instance (Stores and Graph show them together); objects with the `@@debug` method from [patronum#297](https://github.com/effector/patronum/issues/297) work as is:

```ts
import { registerModel } from '@deffector/agent';
registerModel(createSignupForm(), 'signupForm');
```

**Next.js:** `import '@deffector/agent'` in `instrumentation-client.ts`; on the server `attachDeffectorNode()` from `@deffector/agent/node` in `instrumentation.ts`, and wrap the page in a bridge that re-provides `useProvidedScope()` through `DeffectorProvider` — see `demo/next-ssr`.

**Node, SSR, React Native:** run the standalone app and connect over a WebSocket:

```sh
npx @deffector/standalone            # panel on http://localhost:8686
```

```ts
import { attachDeffectorNode, registerScope } from '@deffector/agent/node';
attachDeffectorNode({ name: 'my-server' });
registerScope(requestScope, { name: `request ${id}` });

// React Native: the device reaches your computer by its address
attachDeffectorNode({ name: 'app', url: 'ws://192.168.1.10:8686/agent' });
```

## Repository

|                       |                                                                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/protocol`   | message types, the `$t`-tagged value encoding, the trace format and compatibility check                                                                                                                            |
| `packages/agent`      | runs in the page: hooks `setInspector`/`setGraphInspector`, groups steps into transactions, keeps snapshots, time travel, edits, replay, effect overrides, health checks; adapters for React/Vue/Solid; Node entry |
| `packages/panel`      | the UI (React), shared by the extension and the standalone app                                                                                                                                                     |
| `packages/extension`  | MV3 extension for Chrome/Edge (`dist/`) and Firefox (`dist-firefox/`): content script ⇄ background ⇄ DevTools panel                                                                                                |
| `packages/standalone` | `npx @deffector/standalone`: serves the panel and relays agents over WebSocket                                                                                                                                     |
| `demo/*`              | one effector model (`demo/shared`, built with the babel plugin) in React, Vue, Solid, Next.js, Node SSR, global mode and without the plugin; `demo/lab` for big graphs and edge cases                              |
| `website`             | documentation site (VitePress, English and Russian), deployed to GitHub Pages by `.github/workflows/docs.yml`                                                                                                      |
| `assets/brand`        | logo, favicon, README banner, social preview                                                                                                                                                                       |

```sh
npm install
npm run build              # agent, demo model, extension (Chrome + Firefox), standalone
npm run lint               # ESLint (Airbnb rules, eslint.config.mjs) + Prettier check; lint:fix / format fix
npm run typecheck          # TypeScript, all packages, tests, demos and e2e
npm test                   # unit tests (vitest)
npx playwright install chromium   # once
npm run e2e                # Playwright: loads the extension and drives every demo
npm run docs:dev           # documentation site locally (prints the address)
```

The full guide (installation, every panel tab, configuration, Node/SSR/React Native) is in [`website/`](website/) and on the documentation site.

Load the extension: `chrome://extensions` → Developer mode → **Load unpacked** → `packages/extension/dist`. Firefox 140+: `about:debugging` → This Firefox → **Load Temporary Add-on** → `packages/extension/dist-firefox/manifest.json`. `npm run watch -w @deffector/extension` rebuilds on change.

## Status

0.1, under active development.

MIT
