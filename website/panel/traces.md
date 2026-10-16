# Traces

A **trace** is a JSON file with everything needed to replay what happened in one scope: the state
before the first step, every external call, and every effect result. You record a bug, send the file,
and a teammate replays it in their own build — effects answer from the recording, no twenty clicks —
like the Elm debugger.

<Shot name="traces" alt="The Traces tab: Export trace with the JSON, Import and replay with Open at step, and Test from the trace with generated vitest code" />

## Export

**Export trace** → **Build JSON** (or <kbd>Ctrl</kbd>+<kbd>S</kbd> anywhere, or the export button in
the toolbar). Then **Download .json** or **Copy**. The line under the buttons sums it up:
`7 steps · 4 effect results · 5.6 KB · 2 masked`.

The trace is taken from the live scope and contains:

| Part            | Content                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `format`        | `deffector-trace@1`                                                                                                                       |
| `meta`          | app name, URL, `build`, effector and agent versions, time, scope, user agent; `focus` — the step to open after replay                     |
| `units`         | every unit the trace refers to: name, kind, `sid`, file                                                                                   |
| `initial`       | values of writable stores before the first step                                                                                           |
| `steps`         | the external calls — events from the UI, timers and so on — with their params; edits from the panel are steps too, so they replay as well |
| `effectResults` | what each effect call returned or threw, in call order, with its duration                                                                 |
| `notes`         | the [notes](/panel/log#notes-and-links) you attached                                                                                      |
| `redacted`      | paths that were masked                                                                                                                    |
| `lossy`         | values that cannot be restored exactly (functions, DOM nodes, class instances)                                                            |

**Secrets are masked with their length kept.** Values under keys that look like secrets —
`password`, `passwd`, `secret`, `token`, `authorization`, `cookie`, `api_key` / `apiKey`, `cvv`, `card`
(case-insensitive, also as part of a longer key) — and string values of stores whose name matches are
replaced with `•` of the same length. Validation that checks length replays the same way.

With a transaction selected, the checkbox **open at #N after replay** writes it into `meta.focus`.

## Import and replay

Paste a trace into the text field or **Open file…**, then **Check compatibility**. deffector matches
the units of the trace to the units of the running app:

- by `sid` first;
- if the sid moved (code edited, another build), by name, kind and file — reported as a warning;
- units it cannot find are errors, and steps that call them will be skipped.

The report also says if the trace comes from another build (`build` option) or another effector
version, what was masked, how many values are lossy and how many notes the author left.

Then:

- **Replay in a new scope** — deffector creates a fresh scope from the trace's initial state, mocks
  effect handlers with the recorded results, and replays the steps one by one, so you can watch them
  arrive in the Log. A banner reads “Replaying …: step 3 of 7 — effect results come from the recording,
  the network is not touched”. When it is done, the new scope becomes the live one.
- **Apply instantly** — the same without the pauses; the banner then says “Trace … applied”.

In global mode (no `fork()`) the replay writes the initial state in place and swaps effect handlers
globally for its duration.

### Open at a step

**Open at step** takes `#step=142` (or just the number). After the replay, deffector jumps to the
transaction that corresponds to step 142 of the recording. A `#step=N` pasted after the JSON in the
import field works the same, and a trace with `meta.focus` opens there by itself. If the step is not in
the replay, a message says so.

## Test from the trace

**Copy as test** gives a vitest/jest test that reproduces the trace without the panel:

```ts
import { fork, allSettled } from 'effector';
import { suggestFx, incremented, quickFill } from './/src/index';
import { email_changed } from './/src/field';

// Recorded by deffector: deffector demo · React, 2026-10-17T11:23:34.545Z
test('replays deffector demo · React trace', async () => {
  const replies = {
    suggestFx: [
      { status: 'done', value: ['ann@gmail.com'] },
      { status: 'done', value: [] },
    ],
  };
  const reply = (list: { status: string; value: unknown }[]) => () => {
    const r = list.shift()!;
    return r.status === 'done' ? Promise.resolve(r.value) : Promise.reject(r.value);
  };
  const scope = fork({
    handlers: [[suggestFx, reply(replies.suggestFx)]],
  });
  await allSettled(incremented, { scope });
  await allSettled(email_changed, { scope, params: 'ann@gm' });
  // the password check is wrong here
  await allSettled(quickFill, { scope });
  // expect(scope.getState($store)).toEqual(...)
});
```

It is a starting point (abridged above): imports are derived from the source files of the units and
unit names become identifiers (`email.changed` → `email_changed`), so adjust them to your exports;
non-empty initial values go into `fork({ values })`, recorded effect results into
`fork({ handlers })`, every step becomes an `allSettled`, and your notes become comments. Add the
`expect` that pins the bug.

## What travels and what does not

A trace replays **inputs**, not outputs: the steps are re-run by the kernel of the receiving build, so a
fixed bug really does not reproduce, and a changed model shows its new behaviour. Effects that were
called in the recording get the recorded results, in order; an effect the recording never called
(because the code changed) runs its real handler. What a trace cannot carry: values listed in `lossy`,
and calls to units that the receiving build does not have.

Traces from the [demos](/reference/demos) are interchangeable: the model is compiled with the babel
plugin, so sids are the same, and a trace recorded in React replays in Vue, Solid or Next.js.
