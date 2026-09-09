/**
 * Agent overhead in Node, without a panel rendering in the same browser.
 * Measurement, not a gate: OVERHEAD=1 npx vitest run packages/agent/test/overhead.test.ts
 */
import { it } from 'vitest';
import {
  allSettled,
  combine,
  createEvent,
  createStore,
  fork,
  sample,
  type EventCallable,
  type Store,
} from 'effector';
import { createMemoryTransportPair } from '@deffector/protocol';
import { Agent } from '../src/agent';

const MAPS_PER_FEATURE = 8;

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** `features` chained features of 11 units each: a store, 8 maps, a combine, a sample. */
function chain(features: number, tag: string) {
  const kick = createEvent<number>({ name: `${tag}kick` });
  let previous: Store<number> | null = null;
  for (let feature = 0; feature < features; feature++) {
    const changed = createEvent<number>({ sid: `${tag}${feature}c` });
    let last: Store<number> = createStore(0, { sid: `${tag}${feature}v` }).on(
      changed,
      (_, value) => value,
    );
    for (let i = 0; i < MAPS_PER_FEATURE; i++) last = last.map((value) => value + 1);
    if (previous) {
      last = combine(previous, last, (left, right) => left + right);
      sample({ clock: previous, fn: (value: number) => value + 1, target: changed });
    } else {
      sample({ clock: kick, fn: (value: number) => value + 1, target: changed });
    }
    previous = last;
  }
  return kick;
}

/** Median time of one `allSettled(kick)`, ms. */
async function measure(kick: EventCallable<number>, runs = 15) {
  const scope = fork();
  let params = 1;
  const times: number[] = [];
  for (let i = 0; i < runs; i++) {
    const startedAt = performance.now();
    params += 1;
    await allSettled(kick, { scope, params });
    times.push(performance.now() - startedAt);
  }
  times.sort((a, b) => a - b);
  return Math.round(times[Math.floor(runs / 2)] * 100) / 100;
}

it.runIf(!!process.env.OVERHEAD)(
  'overhead',
  async () => {
    const rows: string[] = [];
    for (const features of [100, 500]) {
      const bare = await measure(chain(features, `b${features}`));
      const agent = new Agent({ name: 'o', graceMs: 1 });
      await sleep(10);
      const paused = await measure(chain(features, `p${features}`));
      const pair = createMemoryTransportPair();
      agent.connect(pair.agent);
      pair.panel.send({ type: 'connect' });
      await sleep(10);
      const recording = await measure(chain(features, `r${features}`));
      const steps = agent.history.transactions.at(-1)?.steps.length;
      rows.push(
        `${features * 11} units, ${steps} recorded steps: no agent ${bare} ms · paused ${paused} ms · recording ${recording} ms`,
      );
    }
    console.log(rows.join('\n'));
  },
  120_000,
);
