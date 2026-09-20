/**
 * Pairs list items with React keys for lists without ids: `baseKey(item)`, with `#2`, `#3`… on
 * repeats (one store can change twice in a transaction).
 */
export function withStableKeys<Item>(
  items: readonly Item[],
  baseKey: (item: Item) => string,
): { key: string; item: Item }[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = baseKey(item);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { key: count === 1 ? base : `${base}#${count}`, item };
  });
}
