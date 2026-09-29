import { useStore } from '../common';
import { EffectCallRow } from './EffectCallRow';
import { selectEffectCalls } from './effectCalls';
import { EffectOverrides } from './EffectOverrides';
import { waterfallBounds } from './waterfallBounds';

/** Network-panel style waterfall of effect calls. */
export function EffectsView() {
  const store = useStore();
  const { texts } = store;
  const calls = selectEffectCalls(store);
  if (!calls.length)
    return (
      <div className="fxwrap">
        <EffectOverrides />
        <div className="empty">{texts.noEffects}</div>
      </div>
    );
  const overriddenNodes = new Set(store.effectOverrides.map((override) => override.node));
  const bounds = waterfallBounds(calls, store.txs.at(-1)?.t ?? 0);
  const columns = texts.effectsTable;
  return (
    <div className="fxwrap">
      <EffectOverrides />
      <div className="fx-head">
        <span>{columns.id}</span>
        <span>{columns.name}</span>
        <span>{columns.params}</span>
        <span>{columns.status}</span>
        <span>{columns.time}</span>
        <span>{columns.waterfall}</span>
      </div>
      {calls.map((call) => (
        <EffectCallRow
          key={call.callId}
          call={call}
          bounds={bounds}
          isOverridden={overriddenNodes.has(call.node)}
        />
      ))}
    </div>
  );
}
