---
layout: home

hero:
  name: deffector
  text: DevTools for effector
  tagline: Every user action as one transaction. Time travel, state injection, and traces that replay a teammate’s bug.
  image:
    src: /logo.svg
    alt: deffector
  actions:
    - theme: brand
      text: Quick start
      link: /guide/quick-start
    - theme: alt
      text: What is deffector?
      link: /guide/introduction
    - theme: alt
      text: GitHub
      link: https://github.com/mxmvshnvsk/deffector

features:
  - title: One action, one transaction
    details: An event and everything it caused in one row of the Log, with the step tree in effector’s own order — filters that returned false, double recomputations, stale reads, calls outside of a scope.
    link: /panel/log
    linkText: Log
  - title: Time travel
    details: Jump to any transaction. With fork() the app renders a forked copy of that moment and the present is untouched; the page is covered so a click cannot change the past.
    link: /panel/time-travel
    linkText: Time travel
  - title: Your own state in any store
    details: Set a value live (logged like allSettled) or silently in a new forked scope, save presets of a whole form, paste a { sid → value } snapshot and see the diff first.
    link: /panel/stores
    linkText: Stores
  - title: Effects under control
    details: A network-panel style waterfall with out-of-order responses highlighted. Keep a call pending, resolve or reject it with a value, add latency or run your own handler.
    link: /panel/effects
    linkText: Effects
  - title: Traces that reproduce bugs
    details: Export the initial state, external calls and effect results as JSON with secrets masked. A teammate replays it in a fresh scope without the network, or copies it as a vitest test.
    link: /panel/traces
    linkText: Traces
  - title: Health checks with fixes
    details: Units without sid, duplicate sids, leaks, cycles, stale reads, writes to derived stores, a foreign inspector — each explained, each with a fix. Infinite loops are stopped before the tab freezes.
    link: /panel/health
    linkText: Health
  - title: Every setup
    details: React, Vue, Solid, Next.js App Router, Node and SSR, React Native, global mode without fork(), with or without the babel/swc plugin. Chrome, Edge and Firefox.
    link: /guide/frameworks
    linkText: Frameworks
  - title: Free when closed
    details: With DevTools closed the agent stops recording after 10 seconds and costs about as much as no agent. Production builds resolve to a no-op.
    link: /reference/performance
    linkText: Performance
---

## Two lines to start

```ts
// the very first import of your app
import '@deffector/agent';
```

```tsx
// render with a provider deffector can switch (time travel and replay)
import { DeffectorProvider } from '@deffector/agent/react';

<DeffectorProvider value={scope} name="client">
  <App />
</DeffectorProvider>;
```

Open DevTools → **deffector**.

<Shot name="log" alt="The Log tab: transactions on the left, the Why tab of the selected transaction on the right" />
