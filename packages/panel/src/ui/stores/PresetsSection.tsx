import { useState } from 'react';
import type { Encoded } from '@deffector/protocol';
import { useStore } from '../common';

/** Saved states of the writable stores: apply one in a click, or save the current one. */
export function PresetsSection({ values }: { values: Record<string, Encoded> | null }) {
  const store = useStore();
  const { texts, presets } = store;
  const [presetName, setPresetName] = useState('');
  const saveCurrent = () => {
    if (!values) return;
    const presetValues: Record<string, Encoded> = {};
    for (const unit of store.units.values())
      if (unit.writable && !unit.internal && unit.id in values)
        presetValues[unit.id] = values[unit.id];
    presets.save(presetName || `#${presets.items.length + 1}`, presetValues);
    setPresetName('');
  };
  return (
    <>
      <div className="h3">{texts.presets}</div>
      <div className="flex">
        {presets.items.map((preset) => (
          <span key={preset.name} className="flex" style={{ gap: 0 }}>
            <button
              className="btn"
              type="button"
              onClick={() => {
                void presets.apply(preset);
              }}
            >
              {preset.name}
            </button>
            <button
              className="ib"
              type="button"
              aria-label="×"
              title="×"
              onClick={() => presets.remove(preset.name)}
            >
              ×
            </button>
          </span>
        ))}
        {!presets.items.length && <span className="hint">{texts.presetEmpty}</span>}
      </div>
      <div className="flex">
        <input
          className="inp"
          placeholder={texts.presetName}
          aria-label={texts.presetName}
          value={presetName}
          onChange={(event) => setPresetName(event.target.value)}
        />
        <button className="btn" type="button" disabled={!values} onClick={saveCurrent}>
          {texts.savePreset}
        </button>
      </div>
    </>
  );
}
