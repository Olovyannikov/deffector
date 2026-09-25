import {
  commitHistory,
  cursorIndex,
  historyTransactions,
  revertHistory,
  travelTo,
} from '../../store';
import { Icon, LiveIcon, useStore } from '../common';
import { HistoryBars } from './HistoryBars';

function positionText(position: number, total: number, isInPast: boolean): string {
  if (!total) return '0';
  return isInPast ? `${position + 1} / ${total}` : `live · ${total}`;
}

/** Time travel: step through the history, back to the present, commit or revert it. */
export function TimeBar() {
  const store = useStore();
  const texts = store.texts.timeBar;
  const history = historyTransactions(store);
  const isInPast = store.timeline.cursor !== null;
  const current = cursorIndex(store, history);
  const isReplaying = store.timeline.mode === 'replay';
  const goTo = (index: number) => travelTo(store, history, index);
  return (
    <div className="tt">
      <button
        className="ib"
        type="button"
        disabled={isReplaying || !history.length}
        onClick={() => goTo(0)}
        aria-label={texts.first}
        title={texts.first}
      >
        <Icon name="first" />
      </button>
      <button
        className="ib"
        type="button"
        disabled={isReplaying || current <= 0}
        onClick={() => goTo(current - 1)}
        aria-label={texts.back}
        title={texts.back}
      >
        <Icon name="back" />
      </button>
      <button
        className="ib"
        type="button"
        disabled={isReplaying || !isInPast}
        onClick={() => goTo(current + 1)}
        aria-label={texts.forward}
        title={texts.forward}
      >
        <Icon name="forward" />
      </button>
      <button
        className={`btn${isInPast ? '' : ' live-on'}`}
        type="button"
        disabled={isReplaying}
        onClick={() => store.jump(null)}
        title={`${store.texts.backToPresent} (Esc)`}
      >
        <LiveIcon />
        {texts.live}
      </button>
      <HistoryBars
        history={history}
        cursorIndex={current}
        isInPast={isInPast}
        isReplaying={isReplaying}
      />
      <span className="pos">{positionText(current, history.length, isInPast)}</span>
      <button
        className="btn"
        type="button"
        disabled={isInPast || isReplaying}
        onClick={() => commitHistory(store)}
        title={texts.commitHint}
      >
        {texts.commit}
      </button>
      <button
        className="btn"
        type="button"
        disabled={isInPast || isReplaying}
        onClick={() => revertHistory(store)}
        title={texts.revertHint}
      >
        {texts.revert}
      </button>
    </div>
  );
}
