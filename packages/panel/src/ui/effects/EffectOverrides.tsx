import { useId, useState } from 'react';
import type { FxOverrideMode } from '@deffector/protocol';
import { setEffectOverride } from '../../store';
import { useStore } from '../common';
import { ActiveOverrides } from './ActiveOverrides';
import { selectOverridableEffects } from './effectCalls';
import { overrideFromForm } from './overrideValue';

const MODES: FxOverrideMode[] = ['pending', 'done', 'fail', 'delay', 'handler'];

/** Force an effect into pending, done or fail, add latency, or run your own handler. */
export function EffectOverrides() {
  const store = useStore();
  const texts = store.texts.effectOverrides;
  const effects = selectOverridableEffects(store);
  const effectSelectId = useId();
  const modeSelectId = useId();
  const [pickedNode, setPickedNode] = useState('');
  const [mode, setMode] = useState<FxOverrideMode>('pending');
  const [value, setValue] = useState('');
  const [delay, setDelay] = useState('2000');
  const [code, setCode] = useState('async (params) => original(params)');
  const node = pickedNode || effects[0]?.id;
  if (!effects.length) return null;
  const takesValue = mode === 'done' || mode === 'fail';
  const apply = () =>
    setEffectOverride(store, overrideFromForm({ node, mode, value, delay, code }));
  return (
    <details className="fxo" open={store.effectOverrides.length > 0}>
      <summary>
        {texts.title}
        {store.effectOverrides.length > 0 && (
          <span className="cbadge warn" style={{ marginLeft: 6 }}>
            {store.effectOverrides.length}
          </span>
        )}
      </summary>
      <div className="flex" style={{ padding: '6px 10px' }}>
        <label className="lbl" htmlFor={effectSelectId}>
          {texts.effect}
          <select
            id={effectSelectId}
            className="inp"
            value={node}
            onChange={(event) => setPickedNode(event.target.value)}
          >
            {effects.map((effect) => (
              <option key={effect.id} value={effect.id}>
                {effect.name}
              </option>
            ))}
          </select>
        </label>
        <label className="lbl" htmlFor={modeSelectId}>
          {texts.mode}
          <select
            id={modeSelectId}
            className="inp"
            value={mode}
            onChange={(event) => setMode(event.target.value as FxOverrideMode)}
          >
            {MODES.map((option) => (
              <option key={option} value={option}>
                {texts.modes[option]}
              </option>
            ))}
          </select>
        </label>
        {takesValue && (
          <input
            className="inp mono"
            style={{ flex: 1, minWidth: 140 }}
            aria-label={texts.value}
            placeholder={texts.value}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        )}
        {mode === 'delay' && (
          <input
            className="inp mono"
            style={{ width: 80 }}
            aria-label={texts.delay}
            value={delay}
            onChange={(event) => setDelay(event.target.value)}
          />
        )}
        {mode === 'delay' && <span className="hint">{texts.delay}</span>}
        <button className="btn pri" type="button" onClick={apply}>
          {texts.apply}
        </button>
      </div>
      {mode === 'handler' && (
        <div style={{ padding: '0 10px 6px' }}>
          <textarea
            className="ed"
            aria-label={texts.code}
            placeholder={texts.code}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck={false}
          />
        </div>
      )}
      <ActiveOverrides />
    </details>
  );
}
