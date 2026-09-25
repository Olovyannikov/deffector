import type { Tx } from '@deffector/protocol';

/** CSS modifier of a history bar: problems first, then effects, edits and branches. */
export function historyBarKind(transaction: Tx): string {
  const { cause, flags, settle } = transaction;
  if (flags.outOfScope || flags.error || settle?.status === 'fail') return 'b-err';
  if (flags.blocked?.length || flags.double?.length) return 'b-warn';
  if (settle || transaction.calls.length) return 'b-fx';
  if (cause?.kind === 'devtools') return 'b-edit';
  if (flags.branch) return 'b-branch';
  return '';
}
