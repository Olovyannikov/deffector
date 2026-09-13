import { preview, type Tx } from '@deffector/protocol';
import type { PanelStore } from '../PanelStore';

export interface TransactionSummary {
  text: string;
  /** CSS modifier of the summary cell */
  tone: '' | 'warn' | 'err' | 'ok';
}

type Settle = NonNullable<Tx['settle']>;

function summarizeSettle(settle: Settle): TransactionSummary {
  if (settle.status === 'fail') return { text: `✕ fail ${preview(settle.value, 50)}`, tone: 'err' };
  const duration = settle.ms !== null ? ` · ${settle.ms} ms` : '';
  return { text: `✓ done ${preview(settle.value, 50)}${duration}`, tone: 'ok' };
}

/** The first change, preferring writable stores (derived ones follow from them), or the first call. */
function summarizeChanges(store: PanelStore, transaction: Tx): TransactionSummary {
  const writableChanges = transaction.changes.filter(
    (change) => store.units.get(change.node)?.writable,
  );
  const changes = writableChanges.length ? writableChanges : transaction.changes;
  const [firstCall] = transaction.calls;
  if (firstCall && !changes.length)
    return {
      text: `→ ${store.unitName(firstCall.node)}(${preview(firstCall.params, 40)})`,
      tone: '',
    };
  if (!changes.length) return { text: store.texts.summary.noChanges, tone: '' };
  const [first] = changes;
  const more = changes.length > 1 ? ` +${changes.length - 1}` : '';
  return {
    text: `${store.unitName(first.node)} ${preview(first.from, 24)} → ${preview(first.to, 30)}${more}`,
    tone: '',
  };
}

/** One-line description of a transaction for the log. */
export function summarizeTransaction(store: PanelStore, transaction: Tx): TransactionSummary {
  const { flags, settle } = transaction;
  if (flags.skipped) {
    const note = transaction.steps[0]?.note;
    return { text: note || store.texts.skip, tone: note && !transaction.cause ? 'warn' : '' };
  }
  if (settle) return summarizeSettle(settle);
  if (flags.outOfScope) {
    const [change] = transaction.changes;
    const detail = change ? `: ${store.unitName(change.node)} → ${preview(change.to, 30)}` : '';
    return { text: `${store.texts.summary.outOfScope}${detail}`, tone: 'err' };
  }
  if (flags.blocked?.length)
    return { text: `✕ ${store.unitName(flags.blocked[0].node)}: filter = false`, tone: 'warn' };
  if (flags.error) {
    const failed = transaction.steps.find((step) => step.status === 'error');
    const detail = failed
      ? `${store.unitName(failed.node)}: ${preview(failed.error!, 50)}`
      : 'error';
    return { text: `✕ ${detail}`, tone: 'err' };
  }
  return summarizeChanges(store, transaction);
}

/** Name of a transaction: what started it. */
export function transactionLabel(store: PanelStore, transaction: Tx): string {
  const { cause, settle } = transaction;
  if (cause?.kind === 'devtools' && cause.label && cause.action !== 'replay') return cause.label;
  // an effect result: show the effect, not its internal `finally` event
  if (settle?.node) return store.unitName(settle.node);
  return store.unitName(transaction.root);
}

export function isProblemTransaction(transaction: Tx): boolean {
  const { flags, settle } = transaction;
  return !!(
    flags.outOfScope ||
    flags.double?.length ||
    flags.blocked?.length ||
    flags.error ||
    flags.truncated ||
    settle?.status === 'fail'
  );
}
