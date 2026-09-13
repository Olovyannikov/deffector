import type { Tx } from '@deffector/protocol';
import type { PanelStore } from '../PanelStore';
import type { LogKindFilter } from '../uiState';
import { isProblemTransaction, transactionLabel } from './transactionSummary';
import { createVersionedSelector } from './versionedSelector';

export function matchesKindFilter(
  store: PanelStore,
  transaction: Tx,
  kind: LogKindFilter,
): boolean {
  switch (kind) {
    case 'event':
      return store.units.get(transaction.root)?.kind === 'event';
    case 'effect':
      return !!transaction.settle || transaction.calls.length > 0;
    case 'edit':
      return transaction.cause?.kind === 'devtools';
    case 'problems':
      return isProblemTransaction(transaction);
    default:
      return true;
  }
}

/** The name filter is a case-insensitive regex; text that is not a valid regex matches as is. */
function createNameMatcher(nameFilter: string): (label: string) => boolean {
  try {
    const regex = new RegExp(nameFilter, 'i');
    return (label) => regex.test(label);
  } catch {
    return (label) => label.includes(nameFilter);
  }
}

/** Transactions the log shows under the scope, kind and name filters. */
export const selectLogTransactions = createVersionedSelector((store: PanelStore): Tx[] => {
  const { kindFilter, nameFilter, scopeFilter } = store.ui;
  const matchesName = nameFilter ? createNameMatcher(nameFilter) : null;
  return store.txs.filter((transaction) => {
    if (scopeFilter !== 'all' && transaction.scopeId !== scopeFilter) return false;
    if (!matchesKindFilter(store, transaction, kindFilter)) return false;
    return !matchesName || matchesName(transactionLabel(store, transaction));
  });
});

/** Count shown on a kind chip: every transaction of that kind, regardless of the other filters. */
export function countByKind(store: PanelStore, kind: LogKindFilter): number {
  return store.txs.filter((transaction) => matchesKindFilter(store, transaction, kind)).length;
}
