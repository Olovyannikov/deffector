import { useState } from 'react';
import type { Scope } from 'effector';
import { buildAndKickGraph, kickGraphAgain } from '../bigGraphBenchmark';

const GRAPH_SIZES = [
  { testId: 'build-1k', featureCount: 100, label: '~1 000 units' },
  { testId: 'build-5k', featureCount: 500, label: '~5 000 units' },
  { testId: 'build-20k', featureCount: 2000, label: '~20 000 units' },
];

/** Builds a big graph in the app's scope and shows how long building and kicking took. */
export function BigGraphCard({ scope }: { scope: Scope }) {
  const [info, setInfo] = useState('');
  return (
    <section className="card">
      <h2>Big graph</h2>
      <div className="row">
        {GRAPH_SIZES.map(({ testId, featureCount, label }) => (
          <button
            key={testId}
            type="button"
            data-testid={testId}
            onClick={async () => setInfo(await buildAndKickGraph(scope, featureCount))}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          data-testid="kick"
          onClick={async () => setInfo(await kickGraphAgain())}
        >
          kick again
        </button>
      </div>
      <p className="muted" data-testid="big-info">
        {info || 'Builds a chain of features: one kick walks every unit.'}
      </p>
    </section>
  );
}
