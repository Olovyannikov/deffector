# Frameworks

The agent is framework-agnostic: `import '@deffector/agent'` first, in every setup. What differs is
the **adapter** that provides the scope to your UI. The adapters are drop-in replacements for
effector’s own providers; they register the scope under a readable name and let deffector render the
app with another scope for time travel and replay.

| Setup                     | Adapter                                                        | Time travel               |
| ------------------------- | -------------------------------------------------------------- | ------------------------- |
| React + `fork()`          | `DeffectorProvider` from `@deffector/agent/react`              | forked copy, present safe |
| Vue + `fork()`            | `withDeffector` / `DeffectorScope` from `@deffector/agent/vue` | forked copy, present safe |
| Solid + `fork()`          | `DeffectorProvider` from `@deffector/agent/solid`              | forked copy, present safe |
| Next.js App Router        | `DeffectorProvider` in a client bridge                         | forked copy, present safe |
| `fork()` without adapter  | —                                                              | values written in place   |
| Global mode (no `fork()`) | —                                                              | values written in place   |

::: tip One copy of effector
The agent hooks the effector instance it imports. If your bundle ends up with two copies (a linked
package, a monorepo), deffector sees only one of them. With Vite, dedupe them:
`resolve: { dedupe: ['effector', 'effector-react'] }`.
:::

## React

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

`DeffectorProvider` takes the same `value` as effector-react’s `Provider`, plus an optional `name`.
Inside, components use `useUnit` as usual.

## Vue

```ts
import '@deffector/agent';
import { createApp } from 'vue';
import { fork } from 'effector';
import { withDeffector } from '@deffector/agent/vue';
import App from './App.vue';

const scope = fork();

// provides the scope to effector-vue (like EffectorScopePlugin)
// and lets deffector swap it for time travel and replay
createApp(withDeffector(App, { scope, name: 'client' })).mount('#app');
```

The component form works too:

```vue
<DeffectorScope :scope="scope" name="client"><App /></DeffectorScope>
```

effector-vue composables read the scope once, in `setup`, so on a scope swap (a jump, a replay) the
subtree under `DeffectorScope` is re-mounted. Local component state inside it is reset.

## Solid

```tsx
import '@deffector/agent';
import { render } from 'solid-js/web';
import { fork } from 'effector';
import { DeffectorProvider } from '@deffector/agent/solid';
import { App } from './App';

const scope = fork();

render(
  () => (
    <DeffectorProvider value={scope} name="client">
      <App />
    </DeffectorProvider>
  ),
  document.getElementById('root')!,
);
```

As in Vue, effector-solid primitives read the scope when a component is created, so the subtree is
re-created on a scope swap.

## Next.js App Router

With [`@effector/next`](https://github.com/effector/next) the client keeps one scope and provides it
with effector-react’s `Provider`. deffector needs two small pieces.

**Client:** import the agent in `instrumentation-client.ts`, which Next.js runs in the browser before
the app code:

```ts
// instrumentation-client.ts
import '@deffector/agent';
```

**A bridge** that re-provides that scope through `DeffectorProvider`:

```tsx
// components/Bridge.tsx
'use client';

import type { ReactNode } from 'react';
import { useProvidedScope } from 'effector-react';
import { DeffectorProvider } from '@deffector/agent/react';

export function Bridge({ children }: { children: ReactNode }) {
  const scope = useProvidedScope();
  if (!scope) return <>{children}</>;
  return (
    <DeffectorProvider value={scope} name="client">
      {children}
    </DeffectorProvider>
  );
}
```

Wrap the page content in it, inside `EffectorNext`:

```tsx
<EffectorNext values={serialize(scope)}>
  <Bridge>
    <App />
  </Bridge>
</EffectorNext>
```

**Server (optional):** send the scope of every request to the [standalone app](/guide/node-ssr):

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { attachDeffectorNode } = await import('@deffector/agent/node');
    attachDeffectorNode({ name: 'next (server)', maxTransactions: 2000 });
  }
}
```

```tsx
// app/page.tsx — a scope per request
import { registerScope } from '@deffector/agent/node';

const scope = fork();
registerScope(scope, { name: `request #${++n}` });
```

The client then shows up in the extension, the server in the standalone app.

**`next.config.mjs`:** the browser entry of the agent is shipped as TypeScript sources, so let Next
compile it; and keep one effector instance on the server, so the agent hooks the one the app uses:

```js
export default {
  transpilePackages: ['@deffector/agent', '@deffector/protocol'],
  serverExternalPackages: ['effector'],
};
```

The demo in `demo/next-ssr` puts its own model package into `serverExternalPackages` as well.

## Global mode (without fork)

If the app never calls `fork()` and renders without a `Provider`, the import alone is enough:

```tsx
import '@deffector/agent';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

Everything is recorded, but time travel cannot render a separate copy of the past. A jump writes
the past values **in place** with `launch`, so watchers, `sample`s and effects react to it; going back
to the present writes the present values the same way. The panel shows a warning banner during a
jump, and Health reports **Global mode: no fork() scope**. Replay mocks effect handlers globally.
**Skip** (re-running history without one transaction) needs a scope and is disabled.

Prefer `fork()` for reliable time travel.

## A scope without an adapter

If the app uses `fork()` but keeps effector’s own `Provider`, deffector sees the scope from the kernel
but cannot render another one. Jumps then write values into the live scope in place, and Health shows
**A scope is used, but the app is not wrapped in DeffectorProvider**. Swap the provider to fix it.

## Without the babel/swc plugin

deffector works without `effector/babel-plugin` or `@effector/swc-plugin`, with fewer details:

- units have no `sid`: Health warns (**N of M stores have no sid**), `serialize(scope)` skips them,
  and a trace can match them only by name;
- names come only from explicit `{ name }` options; other units are shown by their location, like
  `$store@index.js:97`;
- source locations need `import 'effector/enable_debug_traces'` (before the agent), which has a
  runtime cost;
- units are not linked to the factories that created them, so grouping by factory puts them all
  under “—”.

Time travel within the page works the same. With the plugin, list your factories in its `factories`
option, so that every instance gets its own `sid` and its units are grouped by factory.

## Node, SSR and React Native

Code that does not run in a browser tab connects to the standalone app — see
[Node, SSR, React Native](/guide/node-ssr).
