import type { RawTransaction } from '../history';

/** Transactions that started from outside of effector (UI, timers, devtools) — what a replay re-launches. */
export function isExternalRoot(transaction: RawTransaction): boolean {
  if (transaction.flags.skipped || transaction.synthetic || transaction.settle) return false;
  const meta = transaction.root.meta || {};
  if (meta.op === 'fx' || meta.named) return false;
  if (!transaction.cause) return true;
  return transaction.cause.kind === 'devtools' && transaction.cause.action !== 'jump';
}
