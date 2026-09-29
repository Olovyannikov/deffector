import { preview, type FxOverride } from '@deffector/protocol';
import { clearEffectOverride } from '../../store';
import { useStore } from '../common';

function overrideDetail(override: FxOverride): string {
  if (override.mode === 'delay') return ` ${override.delay} ms`;
  return override.value !== undefined ? ` ${preview(override.value, 40)}` : '';
}

export function ActiveOverrides() {
  const store = useStore();
  const texts = store.texts.effectOverrides;
  const overrides = store.effectOverrides;
  return (
    <div style={{ padding: '0 10px 8px' }}>
      {overrides.length ? (
        <>
          <div className="h3">{texts.active}</div>
          {overrides.map((override) => (
            <div key={override.node} className="kv" style={{ padding: '2px 0' }}>
              <span className="k">{store.unitName(override.node)}</span>
              <span>
                {texts.modes[override.mode]}
                {overrideDetail(override)}
              </span>
              <button
                className="link"
                type="button"
                onClick={() => clearEffectOverride(store, override.node)}
              >
                {texts.clear}
              </button>
            </div>
          ))}
          <button className="btn" type="button" onClick={() => clearEffectOverride(store, null)}>
            {texts.clearAll}
          </button>
        </>
      ) : (
        <span className="hint">{texts.none}</span>
      )}
      <div className="hint" style={{ marginTop: 4 }}>
        {texts.hint}
      </div>
    </div>
  );
}
