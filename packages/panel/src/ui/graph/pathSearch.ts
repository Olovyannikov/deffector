import type { Tx } from '@deffector/protocol';
import type { Texts } from '../../i18n';

/** Result of "Path" between the From and To units. */
export type PathSearch = { kind: 'found'; unitIds: string[] } | { kind: 'not-found' } | null;

/** The hint after the path controls: the path found, or what the highlighted numbers mean. */
export function pathHint(
  texts: Texts,
  pathSearch: PathSearch,
  transaction: Tx | null,
  graphFocus: string[] | null,
): string {
  if (pathSearch?.kind === 'not-found') return texts.graphTools.noPath;
  if (pathSearch?.kind === 'found') return texts.graphTools.found(pathSearch.unitIds.length);
  if (transaction && !graphFocus) return texts.graph.transactionPath(transaction.id);
  return texts.graph.pick;
}
