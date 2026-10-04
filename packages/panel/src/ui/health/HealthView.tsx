import { useState } from 'react';
import { checkConsistency } from '../../store';
import { useStore } from '../common';
import { DiagnosticRow } from './DiagnosticRow';

/** What deffector noticed about the app: errors, warnings, and checks on demand. */
export function HealthView() {
  const store = useStore();
  const [isChecking, setIsChecking] = useState(false);
  const checkDerivedStores = async () => {
    setIsChecking(true);
    try {
      await checkConsistency(store);
    } finally {
      setIsChecking(false);
    }
  };
  return (
    <div className="hl" role="list">
      <div className="gtool">
        <button
          className="btn"
          type="button"
          disabled={isChecking}
          onClick={() => {
            void checkDerivedStores();
          }}
        >
          {store.texts.healthActions.consistency}
        </button>
      </div>
      {store.diagnostics.map((diagnostic) => (
        <DiagnosticRow key={diagnostic.id} diagnostic={diagnostic} />
      ))}
    </div>
  );
}
