# FAQ and troubleshooting

## The panel says “Waiting for the deffector agent”

The panel is open but the page has not answered. Check, in order:

1. **The import.** `import '@deffector/agent'` must be in the code that runs in the page — ideally the
   first line of the entry file. Reload the page after adding it.
2. **A production build.** Every entry of the agent is a no-op in production on purpose (“Production
   build? The agent is a no-op there on purpose.”). Use the dev server.
3. **The extension was reloaded** (after `npm run build`). Content scripts of the old version are
   orphaned: reload the page and reopen DevTools.
4. **An address other than localhost.** There the extension needs your permission once: the panel
   shows “deffector has no access to _host_” — press **Allow on this site**.
5. **An iframe.** The content script runs only in the top frame; an app inside an iframe is not
   connected.

The toolbar icon of the extension tells the same thing at a glance: grey and “No deffector agent on this
page” in its popup, or coloured with “effector _version_ detected” and the sid coverage.

## There is no deffector tab in DevTools

The extension is not loaded, or DevTools was opened before it was. Check `chrome://extensions` (or
`about:debugging` in Firefox), then close and reopen DevTools. Firefox removes temporary add-ons on
restart — load it again.

## The first actions are missing from the log

The agent records for 10 seconds after load and then pauses until a panel connects (Health: “History
before the panel opened was not recorded”). Open DevTools first and reload the page, or set
`attachDeffector({ whileClosed: 'record' })`. See [Performance](/reference/performance).

## New transactions stopped appearing

- Is recording paused? The status in the toolbar then reads “recording paused”; press the record
  button.
- Is a saved filter with **Do not record** matching them?
- Did another tool take over effector's inspector? effector has a single inspector slot; effector-logger
  and `@effector/redux-devtools-adapter` use it too. Health reports **Another tool took over the
  effector inspector** — press **Reclaim**, or import the other tool before `@deffector/agent`.

## Some units are missing, or the panel shows two different effectors

The agent hooks the copy of effector it imports. If the bundle has two copies (a linked package, a
monorepo with two versions), units of the other copy are invisible. Dedupe effector in the bundler —
with Vite, `resolve: { dedupe: ['effector', 'effector-react'] }`. In Next.js keep `effector` in
`serverExternalPackages` for the server.

## Units are called `$store@index.js:97`, or Health says “stores have no sid”

The code is compiled without `effector/babel-plugin` or `@effector/swc-plugin`. deffector works, with
less detail; see [Without the babel/swc plugin](/guide/frameworks#without-the-babel-swc-plugin).

## Time travel fires my watchers and effects

The app is in global mode (no `fork()`) or renders without a deffector adapter, so jumps write values in
place. Use `fork()` and `DeffectorProvider` — see [Time travel](/panel/time-travel#two-strategies).

## Skip, “Silently, via fork” or “Replay in a new scope” behave differently in my app

They need a scope that deffector can switch: `fork()` plus an adapter. Without it **Skip** and
**Silently, via fork** are disabled, and replay writes the initial state in place.

## The page is covered and I cannot click

The app shows the past and the page is locked so a click cannot change it. Press <kbd>Esc</kbd> in the
page or **Back to present**, or **Allow clicks** to work in a branch. `lockPast: false` turns the cover
off.

## A trace replays with skipped steps

The receiving build does not have some units (the compatibility check lists them in red), or their sids
moved and they were matched by name (yellow). Record and replay on the same commit when you can, and set
`attachDeffector({ build })` so the check warns about different builds.

## “Own handler” in Override effects throws an error

The handler code is compiled in the page with `new Function`; a Content Security Policy without
`unsafe-eval` blocks it. Use the other override modes, or relax the CSP in development.

## The standalone app sees no agent

- The process must call `attachDeffectorNode()` before it creates units, and must not run with
  `NODE_ENV=production` (or pass `skipInProduction: false`).
- `[deffector] no WebSocket implementation` — Node older than 22: pass `WebSocket` from the `ws`
  package.
- Another machine or a phone: start the app with `--host 0.0.0.0` and use your computer's address in
  `url`.
- Several agents: pick one in the **Agent** selector above the panel.

## Does deffector send my data anywhere?

No. The agent talks to the panel in the same browser (through the extension) or to the standalone app
you run yourself, which listens on `127.0.0.1` by default. deffector has no server of its own. A trace
leaves your machine only when you send the file, and values under secret-looking keys are masked in
it.

## Can I leave the import in production code?

Yes. In production builds every entry point resolves to a no-op with the same API, and
`@deffector/agent/node` does nothing when `NODE_ENV=production`.

## Which versions are supported?

effector 22.6 or newer (developed against 23.4.4, also checked on 22.8.6); React 16.8+, Vue 3.0+,
Solid 1.3+; Chrome and Edge 116+, Firefox 140+. The full table, with Node, TypeScript and bundlers, is in
[Installation → Requirements](/guide/installation#requirements).
