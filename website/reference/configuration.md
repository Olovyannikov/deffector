# Configuration

The agent is created when `@deffector/agent` is imported, with defaults that suit most apps. Change
them with `attachDeffector` right after the import.

```ts
import '@deffector/agent';
import { attachDeffector } from '@deffector/agent';

attachDeffector({
  name: 'shop',
  build: import.meta.env.VITE_GIT_SHA,
  whileClosed: 'record',
});
```

`attachDeffector` is safe to call more than once; each call changes only the options it gets. It
returns `{ agent, detach }`; `detach()` disconnects a `transport` passed in the same call.

## Agent options

| Option            | Default                        | Meaning                                                                                                                                                                |
| ----------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`            | `document.title`, else `'app'` | app name shown in the panel and written to traces; presets and saved filters are stored per name                                                                       |
| `build`           | —                              | build id (a git sha) written to traces; importing a trace from another build warns that sids may have moved                                                            |
| `whileClosed`     | `'pause'`                      | `'pause'`: stop recording `graceMs` after load if no panel is attached, resume when one connects. `'record'`: always record. See [Performance](/reference/performance) |
| `graceMs`         | `10000`                        | how long the agent records after load before pausing without a panel, ms                                                                                               |
| `hardStop`        | `100000`                       | steps in one synchronous kernel run after which deffector cuts propagation (an infinite loop would freeze the tab otherwise); `false` turns the emergency stop off     |
| `lockPast`        | `true`                         | cover the page while it shows the past, so a click cannot change it                                                                                                    |
| `maxTransactions` | `1000`                         | transactions kept in history; older ones are dropped                                                                                                                   |
| `maxSteps`        | `5000`                         | steps recorded per transaction; the rest of the step tree is cut, and Health reports a possible infinite loop                                                          |
| `scope`           | —                              | a scope to register (without an adapter it cannot be switched, see below)                                                                                              |
| `scopeName`       | —                              | name for that scope                                                                                                                                                    |
| `transport`       | —                              | an extra transport, for example `createWebSocketTransport()` to the standalone app                                                                                     |

[`attachDeffectorNode`](/guide/node-ssr#connect-a-node-process) takes the same options plus `url`,
`WebSocket`, `retry`, `onStatus` and `skipInProduction`.

## Entry points

| Import                   | Exports                                                                                         | In production                   |
| ------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------- |
| `@deffector/agent`       | the agent itself (side effect), `attachDeffector`, `registerScope`, `registerModel`, `getAgent` | no-op with the same API         |
| `@deffector/agent/react` | `DeffectorProvider` (`value`, `name`, `children`)                                               | effector-react's `Provider`     |
| `@deffector/agent/vue`   | `withDeffector(App, { scope, name })`, `DeffectorScope` (`scope`, `name`)                       | provides the scope the same way |
| `@deffector/agent/solid` | `DeffectorProvider` (`value`, `name`, `children`)                                               | effector-solid's `Provider`     |
| `@deffector/agent/node`  | `attachDeffectorNode`, `registerScope`, `registerModel`, `getAgent`, `createWebSocketTransport` | no-op with the same API         |

“In production” means the `production` export condition, which Vite and webpack apply in production
builds. `@deffector/agent/node` additionally does nothing when `NODE_ENV=production`.

## registerScope

```ts
import { registerScope } from '@deffector/agent';

registerScope(scope, { name: 'client' });
```

Gives a scope a readable name in the scope selector. deffector notices every scope from the kernel
anyway; naming them helps when there are several (a scope per request on a server, a scope per widget).

The second field, `switcher`, is what the framework adapters pass: a function that renders the app with
another scope. With it, deffector can show a forked copy of the past and replay a trace into a fresh
scope without touching the present. If your UI layer has no adapter, you can write one:

```ts
let current = scope;

registerScope(scope, {
  name: 'client',
  switcher: (next) => {
    current = next; // the scope to render from now on
    rerender(); // re-render the UI with `current`
  },
});
```

The UI must read units through the new scope after the switch; that is why the Vue and Solid adapters
re-create their subtree.

## registerModel

```ts
import { registerModel } from '@deffector/agent';

const signupForm = createSignupForm();
registerModel(signupForm, 'signupForm');
```

Groups the units of a model instance under one name: **Stores → Model** and **Graph → Group: model**
show them together. Pass whatever the factory returned; deffector walks it (nested objects too, up to
four levels) and collects the units it finds.

Objects with the `@@debug` method proposed in
[patronum#297](https://github.com/effector/patronum/issues/297) work as is — `registerModel(instance)`
calls it and uses its `name` and `units`:

```ts
function createCounter(name: string) {
  const inc = createEvent();
  const $count = createStore(0).on(inc, (n) => n + 1);
  return {
    inc,
    $count,
    '@@debug': () => ({ name, units: { inc, $count } }),
  };
}

registerModel(createCounter('likes'));
```

Without `registerModel`, the Model grouping falls back to the factory name the babel/swc plugin
records.

## getAgent

`getAgent()` returns the agent instance. It is meant for tooling and tests; its API is internal and may
change.
