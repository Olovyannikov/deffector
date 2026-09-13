import type { Tx } from '@deffector/protocol';
import type { PanelStore } from './PanelStore';

/** Transactions time travel moves through: skipped ones are not part of the history. */
export function historyTransactions(store: PanelStore): Tx[] {
  return store.txs.filter((transaction) => !transaction.flags.skipped);
}

/** Index of the transaction the app shows in `history`: the last one while live. */
export function cursorIndex(store: PanelStore, history: readonly Tx[]): number {
  const { cursor } = store.timeline;
  if (cursor === null) return history.length - 1;
  return history.findIndex((transaction) => transaction.id === cursor);
}

/** Shows the app right after `history[index]`; the newest one is the present. */
export function travelTo(store: PanelStore, history: readonly Tx[], index: number) {
  const transaction = history[index];
  if (!transaction) return;
  store.jump(index === history.length - 1 ? null : transaction.id);
  store.setUI({ selectedTransactionId: transaction.id });
}

/** One step back (-1) or forward (+1) from what the app shows, never past either end. */
export function stepThroughHistory(store: PanelStore, direction: -1 | 1) {
  const history = historyTransactions(store);
  if (!history.length) return;
  const index = cursorIndex(store, history) + direction;
  travelTo(store, history, Math.max(0, Math.min(history.length - 1, index)));
}
