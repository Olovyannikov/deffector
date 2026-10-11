import { useProvidedScope, useUnit } from 'effector-react';
import { $divisor, $lastLogged, $price, $qty, priceChanged, ratioSet } from '../lab';
import { ErrorBoundary } from './ErrorBoundary';
import { RatioLabel } from './RatioLabel';

export function GlitchesCard() {
  // time travel renders the app with another scope: the ratio may be readable there
  const scope = useProvidedScope();
  const glitches = useUnit({
    priceChanged,
    lastLogged: $lastLogged,
    price: $price,
    qty: $qty,
    ratioSet,
    divisor: $divisor,
  });
  return (
    <section className="card">
      <h2>Glitches</h2>
      <div className="row">
        <button type="button" data-testid="price" onClick={() => glitches.priceChanged(20)}>
          Price → 20, qty → 3
        </button>
        <span className="muted">
          logged total: <b data-testid="logged">{glitches.lastLogged}</b> (should be 60) · price{' '}
          {glitches.price} · qty {glitches.qty}
        </span>
      </div>
      <div className="row">
        <button type="button" data-testid="ratio0" onClick={() => glitches.ratioSet(0)}>
          Divisor → 0 (throws in .map)
        </button>
        <button type="button" onClick={() => glitches.ratioSet(4)}>
          Divisor → 4
        </button>
        <span className="muted">
          ratio:{' '}
          <ErrorBoundary
            resetKeys={[scope, glitches.divisor]}
            fallback={<b data-testid="ratio">error</b>}
          >
            <RatioLabel />
          </ErrorBoundary>{' '}
          · divisor {glitches.divisor}
        </span>
      </div>
    </section>
  );
}
