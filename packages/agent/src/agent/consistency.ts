import { encode, encodedEqual } from '@deffector/protocol';
import { fork, readScopeValue, type Scope } from '../effector';
import type { Registry } from '../registry';

/**
 * Derived stores of a scope compared with a recomputation from the current
 * writable values in a throwaway fork. Returns the ids that disagree.
 */
export function findInconsistentDerivedStores(registry: Registry, scope: Scope | null): string[] {
  const recomputed = fork();
  for (const store of registry.writableStores()) {
    try {
      recomputed.values.idMap[store.stateRef!.id] = readScopeValue(scope, store.stateRef!);
    } catch {
      /* cleared */
    }
  }
  const mismatched: string[] = [];
  for (const record of registry.units.values()) {
    const { info, stateRef } = record;
    if (info.kind !== 'store' || !info.derived || info.internal || !stateRef) continue;
    let actual: unknown;
    let expected: unknown;
    try {
      actual = readScopeValue(scope, stateRef);
    } catch {
      // the app itself cannot read it: its computation throws
      mismatched.push(info.id);
      continue;
    }
    try {
      expected = readScopeValue(recomputed, stateRef);
    } catch {
      // the computation throws for the current sources, yet the store holds a value: stale
      mismatched.push(info.id);
      continue;
    }
    if (actual === expected) continue;
    if (!encodedEqual(encode(actual), encode(expected))) mismatched.push(info.id);
  }
  return mismatched;
}
