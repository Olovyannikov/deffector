import type { Tx } from '@deffector/protocol';
import type { PanelStore } from '../../store';

export interface LogRowBadge {
  key: string;
  text: string;
  /** CSS modifier: warn, err, edit, info, branch, note */
  tone: string;
}

/** Short labels after the summary: problems first, then where the transaction came from. */
export function logRowBadges(store: PanelStore, transaction: Tx): LogRowBadge[] {
  const { badges: labels } = store.texts;
  const { cause, flags } = transaction;
  const badges: LogRowBadge[] = [];
  for (const id of flags.double || [])
    badges.push({ key: `double:${id}`, text: `2× ${store.unitName(id)}`, tone: 'warn' });
  if (flags.outOfScope) badges.push({ key: 'out-of-scope', text: labels.outOfScope, tone: 'err' });
  if (flags.blocked?.length) badges.push({ key: 'blocked', text: 'filter', tone: 'warn' });
  if (cause?.kind === 'devtools' && cause.action !== 'replay')
    badges.push({ key: 'devtools', text: 'devtools', tone: 'edit' });
  if (flags.replay) badges.push({ key: 'replay', text: labels.replay, tone: 'info' });
  if (flags.branch) badges.push({ key: 'branch', text: labels.branch, tone: 'branch' });
  if (transaction.note) badges.push({ key: 'note', text: labels.note, tone: 'note' });
  if (flags.staleReads?.length)
    badges.push({ key: 'stale-read', text: labels.staleRead, tone: 'warn' });
  if (flags.derivedWrite?.length)
    badges.push({ key: 'derived-write', text: labels.derivedWrite, tone: 'warn' });
  if (flags.stopped) badges.push({ key: 'stopped', text: labels.stopped, tone: 'err' });
  if (cause?.kind === 'nested')
    badges.push({ key: 'nested', text: `↳ #${cause.txId}`, tone: 'info' });
  return badges;
}
