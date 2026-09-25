import type { Tx } from '@deffector/protocol';
import { travelTo } from '../../store';
import { useStore } from '../common';
import { historyBarKind } from './historyBarKind';

/** Bars for the newest transactions only: the bar strip has room for about this many. */
const MAX_BARS = 160;
const MAX_BAR_HEIGHT = 30;

interface HistoryBarsProps {
  history: readonly Tx[];
  cursorIndex: number;
  isInPast: boolean;
  isReplaying: boolean;
}

/** One bar per transaction, taller with more steps; a click travels there. */
export function HistoryBars({ history, cursorIndex, isInPast, isReplaying }: HistoryBarsProps) {
  const store = useStore();
  const firstShown = Math.max(0, history.length - MAX_BARS);
  return (
    <div className="bars" role="group" aria-label="history">
      {history.slice(firstShown).map((transaction, offset) => {
        const index = firstShown + offset;
        const visibleStepCount = transaction.steps.filter((step) => !step.internal).length;
        const className = [
          'bar',
          historyBarKind(transaction),
          index === cursorIndex && 'cur',
          isInPast && index > cursorIndex && 'fut',
        ]
          .filter(Boolean)
          .join(' ');
        const label = `#${transaction.id} ${store.unitName(transaction.root)}`;
        return (
          <button
            key={transaction.id}
            type="button"
            className={className}
            style={{ height: Math.min(MAX_BAR_HEIGHT, 6 + visibleStepCount * 1.6) }}
            onClick={() => travelTo(store, history, index)}
            title={label}
            aria-label={label}
            disabled={isReplaying}
          />
        );
      })}
    </div>
  );
}
