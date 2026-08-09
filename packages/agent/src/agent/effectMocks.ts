import { decode, type TraceFile } from '@deffector/protocol';
import type { EffectHandler, Scope } from '../effector';
import type { Registry } from '../registry';

export interface RecordedResult {
  status: 'done' | 'fail';
  value: unknown;
}

/** Recorded effect results per unit id on this page, in call order. */
export function recordedResults(
  trace: TraceFile,
  unitIdsByRef: Record<string, string>,
): Map<string, RecordedResult[]> {
  const resultsByUnit = new Map<string, RecordedResult[]>();
  for (const result of trace.effectResults) {
    const unitId = unitIdsByRef[result.unit];
    if (!unitId) continue;
    if (!resultsByUnit.has(unitId)) resultsByUnit.set(unitId, []);
    resultsByUnit.get(unitId)!.push({ status: result.status, value: decode(result.value) });
  }
  return resultsByUnit;
}

/** Each call takes the next recorded result; calls beyond the recording resolve with undefined. */
function replayingHandler(results: RecordedResult[]): EffectHandler {
  return () => {
    const result = results.shift();
    if (!result) return Promise.resolve(undefined);
    return result.status === 'done' ? Promise.resolve(result.value) : Promise.reject(result.value);
  };
}

/**
 * Mock effect handlers with recorded results. Effects with a sid are mocked
 * per scope through scope.handlers.sidMap; others by swapping the runner's
 * default handler for the duration of the replay. Returns the undo.
 */
export function mockEffects(
  registry: Registry,
  scope: Scope | null,
  resultsByUnit: Map<string, RecordedResult[]>,
): () => void {
  const restores: (() => void)[] = [];
  for (const [unitId, results] of resultsByUnit) {
    const effect = registry.get(unitId);
    if (!effect) continue;
    const mock = replayingHandler(results);
    const { sid } = effect.info;
    if (scope && sid) {
      scope.handlers.sidMap[sid] = mock;
      continue;
    }
    const runnerScope = effect.node.scope?.runner?.scope;
    if (!runnerScope) continue;
    const originalHandler = runnerScope.handler;
    runnerScope.handler = mock;
    restores.push(() => {
      runnerScope.handler = originalHandler;
    });
  }
  return () => restores.forEach((restore) => restore());
}
