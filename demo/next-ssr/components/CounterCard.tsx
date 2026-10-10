import { useUnit } from 'effector-react';
import * as model from '@deffector-demo/shared';

export function CounterCard() {
  const [count, isEven, increment, decrement] = useUnit([
    model.$count,
    model.$isEven,
    model.incremented,
    model.decremented,
  ]);
  return (
    <section className="card">
      <h2>Counter</h2>
      <div className="row">
        <button type="button" data-testid="dec" onClick={() => decrement()}>
          −
        </button>
        <b data-testid="count" className="count">
          {count}
        </b>
        <button type="button" data-testid="inc" onClick={() => increment()}>
          +
        </button>
        <span className="muted">{isEven ? 'even' : 'odd'}</span>
      </div>
    </section>
  );
}
