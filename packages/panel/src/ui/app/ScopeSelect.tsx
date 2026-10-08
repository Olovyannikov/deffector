import { useId } from 'react';
import { useStore } from '../common';

/** Limits the log and Stores to one scope; ● marks the scope the app renders, ⑂ a time-travel branch. */
export function ScopeSelect() {
  const store = useStore();
  const { texts } = store;
  const selectId = useId();
  return (
    <label className="lbl" htmlFor={selectId}>
      {texts.scope}
      <select
        id={selectId}
        className="inp"
        value={store.ui.scopeFilter}
        onChange={(event) => store.setUI({ scopeFilter: event.target.value })}
      >
        <option value="all">{texts.allScopes}</option>
        {store.scopes.map((scope) => (
          <option key={scope.id} value={scope.id}>
            {scope.name}
            {scope.view ? ' ●' : ''}
            {scope.branch ? ' ⑂' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
