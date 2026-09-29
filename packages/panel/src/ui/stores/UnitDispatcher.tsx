import { useState } from 'react';
import { encode, preview } from '@deffector/protocol';
import { dispatchUnit } from '../../store';
import { errorMessage, useStore } from '../common';
import { selectDispatchableUnits, selectLastPayload } from './storeSelectors';

/** Calls an event or effect with a JSON payload; the last payload is the placeholder. */
export function UnitDispatcher() {
  const store = useStore();
  const { texts } = store;
  const units = selectDispatchableUnits(store);
  const [pickedId, setPickedId] = useState('');
  const [payload, setPayload] = useState('');
  const [error, setError] = useState('');
  const target = pickedId || units[0]?.id;
  if (!units.length) return null;
  const lastPayload = selectLastPayload(store, target);
  const call = () => {
    let parsed: unknown;
    if (payload.trim()) {
      try {
        parsed = JSON.parse(payload);
      } catch (parseError) {
        setError(`${texts.invalidJson}: ${errorMessage(parseError)}`);
        return;
      }
    }
    setError('');
    void dispatchUnit(store, target, encode(parsed));
  };
  return (
    <>
      <div className="h3">{texts.dispatch}</div>
      <div className="flex">
        <select
          className="inp"
          aria-label={texts.dispatch}
          value={target}
          onChange={(event) => {
            setPickedId(event.target.value);
            setPayload('');
          }}
        >
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
        <input
          className="inp mono"
          style={{ flex: 1, minWidth: 120 }}
          aria-label={texts.payload}
          placeholder={lastPayload !== undefined ? preview(lastPayload, 60) : texts.payload}
          value={payload}
          onChange={(event) => setPayload(event.target.value)}
        />
        <button className="btn pri" type="button" onClick={call}>
          {texts.dispatch}
        </button>
      </div>
      {error && <span className="errtxt">{error}</span>}
      <span className="hint">{texts.dispatchHint}</span>
    </>
  );
}
