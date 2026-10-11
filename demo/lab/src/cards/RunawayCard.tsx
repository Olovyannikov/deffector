import { useUnit } from 'effector-react';
import { $clamped, $loopCount, clamp, loopStart } from '../lab';

export function RunawayCard() {
  const [loopCount, startLoop, clamped, clampValue] = useUnit([
    $loopCount,
    loopStart,
    $clamped,
    clamp,
  ]);
  return (
    <section className="card">
      <h2>Runaway and cycles</h2>
      <div className="row">
        <button type="button" data-testid="loop" onClick={() => startLoop(0)}>
          Infinite loop (events only)
        </button>
        <span className="muted">
          loop count: <b data-testid="loop-count">{loopCount}</b>
        </span>
      </div>
      <div className="row">
        <button type="button" data-testid="clamp" onClick={() => clampValue(500)}>
          Clamp 500 → 100 (cycle through a store)
        </button>
        <span className="muted">
          clamped: <b data-testid="clamped">{clamped}</b>
        </span>
      </div>
    </section>
  );
}
