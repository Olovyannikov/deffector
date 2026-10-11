import { allSettled, type Scope } from 'effector';
import { buildGraph } from './lab';
import { labTestHandle } from './testHandle';

const MAPS_PER_FEATURE = 8;

/**
 * Builds a big graph, kicks it once in `scope` and returns a summary line.
 * The times go to `window.__lab.stats`, and `window.__lab.kick` kicks the graph again.
 */
export async function buildAndKickGraph(scope: Scope, featureCount: number): Promise<string> {
  const startedAt = performance.now();
  const graph = buildGraph(featureCount, MAPS_PER_FEATURE);
  const builtAt = performance.now();
  await allSettled(graph.kick, { scope, params: 1 });
  const kickedAt = performance.now();
  labTestHandle.stats[`build${graph.unitCount}`] = builtAt - startedAt;
  labTestHandle.stats[`kick${graph.unitCount}`] = kickedAt - builtAt;
  let kickValue = 1;
  labTestHandle.kick = () => {
    // a new value every time, so the whole chain recomputes
    kickValue += 1;
    return allSettled(graph.kick, { scope, params: kickValue });
  };
  const buildMs = Math.round(builtAt - startedAt);
  const kickMs = Math.round(kickedAt - builtAt);
  return `${graph.unitCount} units · build ${buildMs} ms · first kick ${kickMs} ms`;
}

/** Kicks the last built graph again and returns a summary line. */
export async function kickGraphAgain(): Promise<string> {
  const startedAt = performance.now();
  await labTestHandle.kick?.();
  return `kick ${Math.round(performance.now() - startedAt)} ms`;
}
