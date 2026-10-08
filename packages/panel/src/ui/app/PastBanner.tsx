import { useId } from 'react';
import { historyTransactions } from '../../store';
import { useStore } from '../common';

/** While time travel shows the past: where in the history, the click lock, the way back. */
export function PastBanner({ cursor }: { cursor: number }) {
  const store = useStore();
  const { texts, timeline } = store;
  const lockId = useId();
  const history = historyTransactions(store);
  const position = history.findIndex((transaction) => transaction.id === cursor) + 1;
  return (
    <div className="banner" role="status">
      <b>{texts.past(position || cursor, history.length)}</b>
      <span className="hint">
        {timeline.strategy === 'fork' ? texts.pastFork : texts.pastInPlace}
      </span>
      <label
        className="lbl"
        htmlFor={lockId}
        title={timeline.locked ? texts.lock.on : texts.lock.off}
        style={{ marginLeft: 'auto' }}
      >
        <input
          id={lockId}
          type="checkbox"
          checked={!!timeline.locked}
          onChange={(event) => store.setLock(event.target.checked)}
        />
        {texts.lock.block}
      </label>
      <button
        className="btn pri"
        type="button"
        style={{ marginLeft: 0 }}
        onClick={() => store.jump(null)}
      >
        {texts.backToPresent} (Esc)
      </button>
    </div>
  );
}
