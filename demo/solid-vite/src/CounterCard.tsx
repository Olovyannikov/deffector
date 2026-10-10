import { useUnit } from 'effector-solid';
import * as model from '@deffector-demo/shared';

export function CounterCard() {
  const [count, isEven, increment, decrement] = useUnit([
    model.$count,
    model.$isEven,
    model.incremented,
    model.decremented,
  ]);
  return (
    <section class="card">
      <h2>Counter</h2>
      <div class="row">
        <button type="button" data-testid="dec" onClick={() => decrement()}>
          −
        </button>
        <b data-testid="count" class="count">
          {count()}
        </b>
        <button type="button" data-testid="inc" onClick={() => increment()}>
          +
        </button>
        <span class="muted">{isEven() ? 'even' : 'odd'}</span>
      </div>
    </section>
  );
}
