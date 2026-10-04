import type { PaletteItem } from './paletteItems';

const MAX_RESULTS = 50;

/** Every term must appear in the label (or the hint); earlier matches rank higher. -1: no match. */
function score(item: PaletteItem, terms: readonly string[]): number {
  const label = item.label.toLowerCase();
  const hint = (item.hint || '').toLowerCase();
  let total = 0;
  for (const term of terms) {
    const position = label.indexOf(term);
    if (position >= 0) total += 100 - Math.min(position, 90);
    else if (hint.includes(term)) total += 10;
    else return -1;
  }
  return total;
}

/**
 * Items matching the query. "#12" goes straight to transaction 12; an empty query lists the tabs
 * and actions.
 */
export function searchPalette(items: readonly PaletteItem[], query: string): PaletteItem[] {
  const transactionId = /^#(\d+)$/.exec(query.trim());
  if (transactionId) return items.filter((item) => item.key === `tx:${transactionId[1]}`);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length)
    return items
      .filter((item) => !item.key.startsWith('unit:') && !item.key.startsWith('tx:'))
      .slice(0, MAX_RESULTS);
  return items
    .map((item) => ({ item, score: score(item, terms) }))
    .filter((ranked) => ranked.score >= 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_RESULTS)
    .map((ranked) => ranked.item);
}
