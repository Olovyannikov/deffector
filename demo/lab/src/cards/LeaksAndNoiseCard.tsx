import { useState } from 'react';
import { useUnit } from 'effector-react';
import { $polled, createLeakyModel, pollTick } from '../lab';

const POLL_INTERVAL_MS = 200;

export function LeaksAndNoiseCard() {
  const [polled, firePollTick] = useUnit([$polled, pollTick]);
  const [createdModels, setCreatedModels] = useState(0);
  const [pollIntervalId, setPollIntervalId] = useState<number | null>(null);
  const isPolling = pollIntervalId !== null;

  const createModel = () => {
    createLeakyModel();
    setCreatedModels((count) => count + 1);
  };

  const togglePolling = () => {
    if (isPolling) {
      clearInterval(pollIntervalId);
      setPollIntervalId(null);
      return;
    }
    let pollCount = 0;
    const intervalId = window.setInterval(() => {
      pollCount += 1;
      firePollTick(pollCount);
    }, POLL_INTERVAL_MS);
    setPollIntervalId(intervalId);
  };

  return (
    <section className="card">
      <h2>Leaks and noise</h2>
      <div className="row">
        <button type="button" data-testid="leak" onClick={createModel}>
          Create a model on click
        </button>
        <span className="muted">created: {createdModels}</span>
      </div>
      <div className="row">
        <button type="button" data-testid="poll" onClick={togglePolling}>
          {isPolling ? 'Stop polling' : 'Start polling (pollTick every 200 ms)'}
        </button>
        <span className="muted">
          polled: <b data-testid="polled">{polled}</b>
        </span>
      </div>
    </section>
  );
}
