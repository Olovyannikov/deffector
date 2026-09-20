import type { Tx } from '@deffector/protocol';
import { summarizeTransaction, transactionLabel } from '../../store';
import { formatSeconds, Glyph, glyphClass, useStore } from '../common';
import { logRowBadges } from './logRowBadges';
import { scopeStripeColor } from './scopeStripeColor';

interface LogRowProps {
  transaction: Tx;
  isSelected: boolean;
  /** after the time-travel cursor: not applied in what the app shows */
  isFuture: boolean;
}

/** One transaction in the log. Clicks and keys are handled by the list (see LogView). */
export function LogRow({ transaction, isSelected, isFuture }: LogRowProps) {
  const store = useStore();
  const { cause, flags } = transaction;
  const summary = summarizeTransaction(store, transaction);
  const label = transactionLabel(store, transaction);
  const isDevtoolsEdit = cause?.kind === 'devtools';
  const glyphUnit =
    isDevtoolsEdit && cause.action !== 'replay'
      ? undefined
      : store.units.get(transaction.settle?.node || transaction.root);
  const visibleStepCount = transaction.steps.filter((step) => !step.internal).length;
  const className = [
    'row',
    isSelected && 'sel',
    isFuture && 'fut',
    (flags.outOfScope || flags.stopped) && 'err',
    flags.skipped && 'skipped',
  ]
    .filter(Boolean)
    .join(' ');
  const highlight = store.savedFilters.items.length
    ? store.savedFilters.highlightColor(label)
    : null;
  return (
    <div
      className={className}
      role="option"
      aria-selected={isSelected}
      data-transaction-id={transaction.id}
      title={`${label}: ${summary.text}`}
    >
      <span className="stripe" style={{ background: scopeStripeColor(store, transaction) }} />
      <span className="c-n">{transaction.id}</span>
      <span className="c-t">+{formatSeconds(transaction.t)}s</span>
      <span
        className="hlt"
        style={highlight ? { background: highlight } : undefined}
        aria-hidden="true"
      />
      <Glyph glyph={glyphClass(glyphUnit, isDevtoolsEdit)} />
      <span className="c-name">{label}</span>
      <span className={`c-sum ${summary.tone}`}>{summary.text}</span>
      {logRowBadges(store, transaction).map((badge) => (
        <span key={badge.key} className={`bdg ${badge.tone}`}>
          {badge.text}
        </span>
      ))}
      <span className="c-k">{store.texts.steps(visibleStepCount)}</span>
    </div>
  );
}
