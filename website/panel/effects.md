# Effects

The **Effects** tab is a network-panel style list of every effect call, and a place to control what
effects do.

<Shot name="effects" alt="The Effects tab: four calls of suggestFx, signupFx and greetLaterFx with status, time and a waterfall" />

## The waterfall

One row per call: the call number, the effect, its params, the status (`pending`, `done`, `fail`), how
long it took, and a bar on a shared time axis. Pending calls grow live.

A call that **finished after a later call of the same effect** is highlighted — “finished after a
later call”. That is the classic race: a slow response for an old query overwrites the result of a
newer one. In the demo, type fast in the email field and watch `suggestFx`.

Hover a row to see who called it (“called by #3”) and the result; click it to open the transaction in
the [Log](/panel/log) (the one where it settled, if it has).

## Override effects

![Override effects open: signupFx set to add latency 2000 ms, listed under Active overrides](/screens/x-overrides.png){.screen}

Expand **Override effects** to change what an effect does, without touching the code:

| Mode             | What happens                                                                          |
| ---------------- | ------------------------------------------------------------------------------------- |
| **keep pending** | calls never settle — test your spinners and disabled buttons                          |
| **resolve with** | calls resolve with the JSON value you type                                            |
| **reject with**  | calls reject with the value (plain text is fine for an error message)                 |
| **add latency**  | calls wait the given number of ms, then run the real handler                          |
| **own handler**  | your function: `async (params) => …`, where `original(params)` calls the real handler |

Pick the effect and the mode, fill the value and press **Override**. Active overrides are listed with
**Remove** next to each and **Remove all**; overridden effects get an `overridden` badge in the
waterfall, and the section header shows how many are active.

How it works: the override replaces the effect's default handler (used by every scope and by the global
graph) and, for effects with a `sid`, the handler in every known scope — a handler set with
`fork({ handlers })` would otherwise win. It “applies to every scope of the page”. Calls held by **keep
pending** continue with the real handler when the override is removed.

::: warning Own handler and CSP
The **own handler** code is compiled in the page with `new Function`. A page whose Content Security
Policy forbids `unsafe-eval` will refuse it; the other modes work everywhere.
:::

Overrides are not recorded into traces as such — a trace keeps the _results_ the effects produced, and
replay uses those results anyway.
