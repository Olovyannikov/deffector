# Performance

deffector sits on effector's kernel inspector: it sees every step of every transaction. That is not
free, so the agent is careful about when it records.

## Paused while DevTools is closed

By default (`whileClosed: 'pause'`):

1. After load the agent records for `graceMs` — 10 seconds. If you open DevTools during that time, the
   start of the page is in the log.
2. If no panel has connected by then, the agent **pauses**: it drops what it recorded and stops
   recording. Only the [emergency stop](#emergency-stop) keeps counting steps.
3. When the panel connects, recording resumes from the current state. Health shows “History before
   the panel opened was not recorded”.
4. When the panel disconnects, the agent waits 3 seconds (a restarted extension service worker
   reconnects within that time) and pauses again.

To record the start of a page, open DevTools and reload. To record always, set
`attachDeffector({ whileClosed: 'record' })`.

While paused, the kernel hook returns right after counting the step for the emergency stop: nothing is
built, analysed or sent. (The **Pause recording** button in the panel is different: the panel is
attached, transactions are not stored, but their state changes are folded into the base so later jumps
stay correct.)

## What it costs

Measured in the lab demo (`demo/lab`), on graphs of about 1 000, 5 000 and 20 000 units where one action
walks every unit:

| Mode                    | Cost of one action          |
| ----------------------- | --------------------------- |
| no agent (`?noagent`)   | the baseline                |
| agent installed, paused | about the same as no agent  |
| recording, panel open   | about **3–7×** the baseline |

Recording means: register every unit, put every step into a transaction with its lane, parent and
values, find double updates, stale reads and filters that stopped, keep store changes for time travel,
and send it all to the panel. In ordinary apps an action is a few dozen steps and the difference is not
noticeable; in a 20 000-unit chain it is.

To measure on your machine:

```sh
npm run dev:lab                                         # http://localhost:5178
PERF=perf.json npx playwright test e2e/perf.spec.ts     # writes the numbers to perf.json
```

The test compares `?noagent`, a paused agent (`?grace=200`) and recording, and also times how long the
panel takes to connect and to draw the graph.

## Limits that keep memory flat

| Setting                                       | Default | Effect                                                                     |
| --------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| `maxTransactions`                             | 1000    | history length; older transactions are dropped                             |
| `maxSteps`                                    | 5000    | steps recorded per transaction; the rest of a huge transaction is not kept |
| [Do not record](/panel/filters#do-not-record) | —       | noisy transactions keep only their state changes and are not sent          |

In the panel, the Log draws only the visible rows, the palette searches the last 300 transactions, and
the Graph draws at most 120 units until you ask for more.

## Emergency stop

An event that triggers itself through `sample` or a watcher never ends: effector's kernel loop has no
limit, and the tab freezes. deffector counts steps in each synchronous kernel run; past `hardStop`
(100 000) it **cuts the propagation**: every node that runs past the limit stops passing values to its
children, the kernel drains its queue and returns, and on the next microtask deffector puts the links
back. The tab survives, the app keeps working, and:

- the transaction is marked `stopped` in the Log;
- Health shows **deffector stopped an infinite loop** with the hottest units and **Show in Graph**;
- the console gets `[deffector] deffector stopped an infinite loop: …`.

The state may be partially updated by the loop. The stop works while recording is paused too. Set
`hardStop: false` to turn it off, or a larger number if your app legitimately runs more steps in one go.

Separately, cycles through events only are found in the static graph and reported in Health before
they ever run.

## Production

Every entry point resolves to a no-op through the `production` export condition, and
`@deffector/agent/node` also checks `NODE_ENV`. Nothing is hooked, nothing is recorded. See
[Installation](/guide/installation#production-builds).

## Pages without an agent

The extension's content script runs on localhost and on the sites you allowed, and opens a connection to the extension only after
the page's agent speaks, so pages without effector cost nothing.
