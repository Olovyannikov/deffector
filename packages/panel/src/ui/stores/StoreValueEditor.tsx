import { useState } from 'react';
import { decode, encode, type Encoded, type UnitInfo } from '@deffector/protocol';
import { editStoreValue, type EditMode } from '../../store';
import { errorMessage, useStore } from '../common';

/** Edits a writable store as JSON. Mounted per store, so a draft never carries over to another. */
export function StoreValueEditor({ unit, value }: { unit: UnitInfo; value: Encoded | undefined }) {
  const store = useStore();
  const { texts } = store;
  /** what the user typed; null shows the current value */
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState('');
  const current = value === undefined ? '' : (JSON.stringify(decode(value), null, 2) ?? '');
  const text = draft ?? current;
  const apply = (mode: EditMode) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      setError(`${texts.invalidJson}: ${errorMessage(parseError)}`);
      return;
    }
    setError('');
    setDraft(null);
    void editStoreValue(store, unit.id, encode(parsed), mode);
  };
  return (
    <>
      <div className="h3">{texts.setValue}</div>
      <textarea
        className="ed"
        aria-label={texts.setValue}
        value={text}
        onChange={(event) => setDraft(event.target.value)}
        spellCheck={false}
      />
      {error && <span className="errtxt">{error}</span>}
      <div className="flex">
        <button className="btn pri" type="button" onClick={() => apply('live')}>
          {texts.apply}
        </button>
        <button
          className="btn"
          type="button"
          disabled={!store.scopes.some((scope) => scope.switchable)}
          onClick={() => apply('silent')}
        >
          {texts.applySilent}
        </button>
      </div>
      <span className="hint">{texts.editHint}</span>
    </>
  );
}
