import { useUnit } from 'effector-react';
import { $results, $searchError, $ticks, search, searchFx, startTimerFx } from '../lab';

export function EffectsCard() {
  const effects = useUnit({
    search,
    results: $results,
    searchError: $searchError,
    searching: searchFx.pending,
    startTimer: startTimerFx,
    ticks: $ticks,
  });
  return (
    <section className="card">
      <h2>Effects</h2>
      <div className="row">
        <input
          data-testid="q"
          placeholder="search…"
          onChange={(event) => effects.search(event.target.value)}
        />
        <span className="muted">
          {effects.searching ? 'searching…' : ''}{' '}
          <b data-testid="results">{effects.results.join(', ') || '—'}</b>{' '}
          <span className="err" data-testid="search-error">
            {effects.searchError}
          </span>
        </span>
      </div>
      <div className="row">
        <button type="button" data-testid="timer-bug" onClick={() => effects.startTimer(false)}>
          Timer without scopeBind
        </button>
        <button type="button" onClick={() => effects.startTimer(true)}>
          Timer with scopeBind
        </button>
        <span className="muted">
          ticks: <b data-testid="ticks">{effects.ticks}</b>
        </span>
      </div>
    </section>
  );
}
