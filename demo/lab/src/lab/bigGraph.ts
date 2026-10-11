import { combine, createEvent, createStore, sample, type Store, type Unit } from 'effector';
import { declaredAt } from './declaredAt';

export interface BigGraph {
  /** walks the whole graph: every feature recomputes */
  kick: ReturnType<typeof createEvent<number>>;
  unitCount: number;
}

/**
 * `featureCount` fake files, each with a chain: event → store → `mapsPerFeature`
 * maps → combine with the previous feature → sample to the next feature.
 * Unit names and sids carry the feature count, so graphs of different sizes can coexist.
 */
export function buildGraph(featureCount: number, mapsPerFeature: number): BigGraph {
  const kick = createEvent<number>({
    name: 'kick',
    sid: `g${featureCount}:kick`,
    ...declaredAt('src/graph/root.ts', 1),
  });
  let unitCount = 1;
  let previousFeature: Store<number> | null = null;
  for (let feature = 0; feature < featureCount; feature++) {
    const file = `src/features/f${feature}/model.ts`;
    const changed = createEvent<number>({
      name: `f${feature}.changed`,
      sid: `g${featureCount}:f${feature}:changed`,
      ...declaredAt(file, 1),
    });
    let featureValue: Store<number> = createStore(0, {
      name: `$f${feature}.value`,
      sid: `g${featureCount}:f${feature}:value`,
      ...declaredAt(file, 2),
    }).on(changed, (_, value) => value);
    unitCount += 2;
    for (let i = 0; i < mapsPerFeature; i++) {
      featureValue = featureValue.map((value) => value + 1);
      unitCount += 1;
    }
    if (previousFeature) {
      featureValue = combine(previousFeature, featureValue, (previous, own) => previous + own);
      unitCount += 1;
    }
    // the first feature starts from the kick, every next one from the previous feature
    const clock: Unit<number> = previousFeature ?? kick;
    sample({ clock, fn: (value) => value + 1, target: changed });
    previousFeature = featureValue;
  }
  return { kick, unitCount };
}
