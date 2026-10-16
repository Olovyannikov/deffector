# Quick start

Three steps for a React app with `fork()`. Other frameworks differ only in the adapter — see
[Frameworks](/guide/frameworks).

## 1. Import the agent first

```ts
// src/main.tsx — the very first import
import '@deffector/agent';
```

The agent must see units as they are created. Units created before the import are still found when
they run, but without factory and region information.

## 2. Use DeffectorProvider

Replace effector-react’s `Provider` with `DeffectorProvider`:

```tsx
import '@deffector/agent';
import { createRoot } from 'react-dom/client';
import { fork } from 'effector';
import { DeffectorProvider } from '@deffector/agent/react';
import { App } from './App';

const scope = fork();

createRoot(document.getElementById('root')!).render(
  <DeffectorProvider value={scope} name="client">
    <App />
  </DeffectorProvider>,
);
```

`name` is what the panel shows in the scope selector. The provider lets deffector render the app with
another scope — that is what makes time travel safe (the present is never touched) and replay
possible.

## 3. Open DevTools → deffector

Use the app: every action appears in the [Log](/panel/log) as one row. Then try:

- **double-click a row** — the app shows that moment; <kbd>Esc</kbd> returns to the present;
- <kbd>Ctrl</kbd>+<kbd>[</kbd> / <kbd>Ctrl</kbd>+<kbd>]</kbd> — step back and forward;
- **Stores** — pick a store, type a JSON value, press **Apply**;
- **Health** — what deffector found suspicious, each with a fix;
- <kbd>Ctrl</kbd>+<kbd>S</kbd> — export a trace and send it to a teammate.

If the panel says “Waiting for the deffector agent”, the page has no agent: check that the import is
really first and reload the page. See [FAQ](/reference/faq).

## DevTools opened later

With DevTools closed, the agent records the first 10 seconds after load and then pauses (it costs
almost nothing while paused). When you open the panel, recording resumes from the current state, and
Health tells you that the history before was not recorded. To record from the very start, open
DevTools and reload the page — or keep recording always:

```ts
import { attachDeffector } from '@deffector/agent';

attachDeffector({ whileClosed: 'record' });
```

All options are in [Configuration](/reference/configuration).

## Without fork()

If your app works with the global graph (no `fork()`, no `Provider`), the import alone is enough.
Time travel then writes values in place and watchers react to it — see
[global mode](/guide/frameworks#global-mode-without-fork).

## Trying the demos

The repository has the same model in every framework, with buttons that reproduce classic mistakes:

```sh
npm install && npm run build
npm run dev:react   # http://localhost:5171
```

All demos are listed in [Demos](/reference/demos).
