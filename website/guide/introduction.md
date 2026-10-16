# Introduction

deffector is a DevTools for [effector](https://effector.dev). It shows every user action as one
**transaction** — an event and everything it caused — lets you travel through them, put your own
state into any store, and record **traces** that another developer replays to reproduce your bug,
like the Elm debugger.

<Shot name="log" alt="The deffector panel: the Log on the left, the inspector of transaction #4 on the right" />

## Why

effector is fast and declarative, and the same properties make some bugs hard to see:

- an event called from `setTimeout` or a socket without `scopeBind` changes the global graph, while
  the app reads its own scope — nothing happens on screen;
- `combine` and `sample` run in declaration order, not in graph order, so a store can be recomputed
  twice or a `sample` can read a value that is about to change;
- a `filter` that returned `false` leaves no trace at all;
- an exception in a `.map` stops one branch, the other branches have already committed;
- a bug that needs twenty clicks and a slow server response is hard to hand over to a teammate.

deffector records what the kernel actually did and explains it in the panel: the
[Log](/panel/log) shows the steps, [Health](/panel/health) turns the known pitfalls into warnings
with a fix, [Traces](/panel/traces) make the bug reproducible.

## How it works

<Architecture />

**The agent** (`@deffector/agent`) runs inside your page. It must be the first import, so that it
sees units as they are created. It hooks effector’s kernel inspector and graph inspector —
`setInspector` and `setGraphInspector`, the runtime exports `effector/inspect` is built on. They give
the raw graph nodes, the exact parent of every step and the scope of every call, in all scopes at
once:

- every unit is registered with its name, `sid`, source file, factory, domain and model;
- every kernel step is grouped into the transaction it belongs to, with the lane, the value before
  and after, and the reason it stopped (a filter, the same value, an exception);
- changes of writable stores are kept per transaction, so the state of any past moment can be
  rebuilt;
- commands from the panel — jump, edit, call, override, replay — are executed in the page.

**The adapter** (`DeffectorProvider` for React and Solid, `withDeffector` / `DeffectorScope` for
Vue) is a drop-in replacement for effector’s own `Provider`. It registers the scope under a readable
name and gives the agent a way to render the app with _another_ scope: a forked copy of the past for
time travel, or a fresh scope for replaying a trace.

**The panel** is one React UI, used in two places:

- **the browser extension** (Chrome, Edge, Firefox) — the agent talks to a content script with
  `window.postMessage`, the content script to the background worker, the background to the DevTools
  panel. The content script opens its port only when the page has an agent, so ordinary pages cost
  nothing;
- **the standalone app** (`npx @deffector/standalone`) — for code outside a browser tab: SSR servers,
  Node scripts, tests, React Native. Agents connect over a WebSocket to `/agent`, panels in any
  browser tab connect to `/panel`.

In production builds every entry point of `@deffector/agent` resolves to a no-op through the
`production` export condition, so the import can stay in your code.

## Words used in these docs

| Term        | Meaning                                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transaction | One root call (a UI event, a timer, a settled effect, an edit from the panel) and every kernel step it caused synchronously.                        |
| Step        | One node the kernel ran: a store update, an operator (`sample`, `map`, `on`…), an effect call.                                                      |
| Lane        | The kernel priority the step ran in: `pure`, `read`, `child`, `barrier`, `sampler`, `effect`.                                                       |
| Scope       | A `fork()` of the app state. `global` means the global graph (no scope).                                                                            |
| Branch      | A scope deffector created: a forked past after a jump, a scope with silent edits, or a replay. Marked with `⑂` in the scope selector.               |
| Trace       | A JSON file (`deffector-trace@1`) with the initial state, the external calls and the effect results of one scope — enough to replay the same story. |

## Status

deffector is at version 0.1 and under active development. The changes it would like to see in
effector itself are listed in [Upstream effector PRs](/reference/upstream); until they are merged,
deffector works on workarounds.
