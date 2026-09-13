import type { PanelStore } from '../PanelStore';

interface CacheEntry<Args, Result> {
  version: number;
  args: Args;
  result: Result;
}

function haveSameItems(left: readonly unknown[], right: readonly unknown[]): boolean {
  return left.length === right.length && left.every((item, index) => Object.is(item, right[index]));
}

/**
 * Memoizes a selector by the store version and its arguments. The store changes in place (the same
 * `units` map, the same arrays) and bumps `version` on every change, so the version is what tells a
 * stale result from a fresh one. One entry per store is kept: the last call.
 */
export function createVersionedSelector<Args extends unknown[], Result>(
  select: (store: PanelStore, ...args: Args) => Result,
): (store: PanelStore, ...args: Args) => Result {
  const cache = new WeakMap<PanelStore, CacheEntry<Args, Result>>();
  return (store, ...args) => {
    const cached = cache.get(store);
    if (cached && cached.version === store.version && haveSameItems(cached.args, args))
      return cached.result;
    const result = select(store, ...args);
    cache.set(store, { version: store.version, args, result });
    return result;
  };
}
