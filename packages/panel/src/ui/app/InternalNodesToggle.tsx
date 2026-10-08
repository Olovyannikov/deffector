import { useId } from 'react';
import { useStore } from '../common';

/** Shows effector's helper nodes (`.updates`, `finally`, operators) in the log, Stores and Graph. */
export function InternalNodesToggle() {
  const store = useStore();
  const { texts } = store;
  const checkboxId = useId();
  return (
    <label className="lbl lbl-int" title={texts.internal} htmlFor={checkboxId}>
      <input
        id={checkboxId}
        type="checkbox"
        checked={store.ui.showInternal}
        onChange={(event) => store.setUI({ showInternal: event.target.checked })}
      />
      <span>{texts.internal}</span>
    </label>
  );
}
