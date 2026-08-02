import type { Node } from '../effector';
import type { RawTransaction } from '../history';
import type { Registry } from '../registry';
import type { Scopes } from '../scopes';

/** graph hops searched to see whether one double-updated store feeds another (combine → map → store) */
const FEED_SEARCH_DEPTH = 6;

/**
 * A double recomputation matters only if something sees the intermediate value.
 * Stores without a sid and without any consumer (the source combine that sample
 * creates for `source: {…}`) are only read on demand: skip them.
 */
function isObservable(
  transaction: RawTransaction,
  id: string,
  registry: Registry,
  scopes: Scopes,
): boolean {
  const record = registry.get(id);
  if (!record || record.info.sid) return true;
  const links = scopes.get(transaction.scopeId)?.additionalLinks || {};
  const hasScopeLinks = (node: Node) => !!links[node.id]?.length;
  if (hasScopeLinks(record.node)) return true;
  return (record.node.next || []).some(
    (next) => next.meta?.named !== 'updates' || (next.next || []).length > 0 || hasScopeLinks(next),
  );
}

/** Static reachability through the graph, a few hops deep. */
function feedsAnother(start: Node, reported: Set<string>): boolean {
  let frontier = [start];
  const seen = new Set<string>([start.id]);
  for (let depth = 0; depth < FEED_SEARCH_DEPTH && frontier.length; depth++) {
    const nextFrontier: Node[] = [];
    for (const node of frontier) {
      for (const next of node.next || []) {
        if (seen.has(next.id)) continue;
        if (reported.has(next.id)) return true;
        seen.add(next.id);
        nextFrontier.push(next);
      }
    }
    frontier = nextFrontier;
  }
  return false;
}

/** Stores recomputed more than once in one transaction that somebody could observe. */
export function findDoubleUpdates(
  transaction: RawTransaction,
  changeCounts: Map<string, number>,
  registry: Registry,
  scopes: Scopes,
): string[] {
  const updatedTwice: string[] = [];
  for (const [id, count] of changeCounts) {
    if (count > 1 && isObservable(transaction, id, registry, scopes)) updatedTwice.push(id);
  }
  if (updatedTwice.length <= 1) return updatedTwice;
  // report the most downstream store: an intermediate (combine's inner store) feeding a reported one is noise
  const nodesById = new Map(transaction.steps.map((step) => [step.node.id, step.node]));
  const reported = new Set(updatedTwice);
  return updatedTwice.filter((id) => !feedsAnother(nodesById.get(id)!, reported));
}
