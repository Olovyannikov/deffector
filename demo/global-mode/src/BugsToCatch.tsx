import { useUnit } from 'effector-react';
import * as model from '@deffector-demo/shared';

const ANN = { email: 'ann@example.com', password: 'secret-pass', name: 'Ann Lee' };

/** Each button reproduces a classic effector mistake from the shared model. */
export function BugsToCatch() {
  const bugs = useUnit({
    greetLater: model.greetLaterFx,
    greeting: model.$greeting,
    quickFill: model.quickFill,
    strength: model.$profileStrength,
    name: model.name.$value,
    nameChanged: model.name.changed,
  });
  return (
    <section className="card">
      <h2>Bugs to catch</h2>
      <p className="muted">
        Each button reproduces a classic effector mistake. Open DevTools → deffector and watch the
        Log and Health tabs.
      </p>
      <div className="row">
        <button
          type="button"
          data-testid="greet-bug"
          onClick={() => bugs.greetLater({ name: bugs.name, fixed: false })}
        >
          Greet later (no scopeBind)
        </button>
        <button type="button" onClick={() => bugs.greetLater({ name: bugs.name, fixed: true })}>
          Greet later (fixed)
        </button>
      </div>
      <p>
        Greeting: <b data-testid="greeting">{bugs.greeting || '—'}</b>
      </p>
      <div className="row">
        <button type="button" data-testid="quick-fill" onClick={() => bugs.quickFill(ANN)}>
          Quick fill (double update)
        </button>
        <span className="muted">strength: {bugs.strength}</span>
      </div>
      <div className="row">
        <button type="button" onClick={() => bugs.nameChanged('crash')}>
          Name = “crash” (throws in .map)
        </button>
      </div>
    </section>
  );
}
