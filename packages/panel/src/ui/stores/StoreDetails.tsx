import type { Encoded, UnitInfo } from '@deffector/protocol';
import { Glyph, glyphClass, useStore, ValueTree } from '../common';
import { PresetsSection } from './PresetsSection';
import { StoreHistory } from './StoreHistory';
import { StoreMeta } from './StoreMeta';
import { StoreValueEditor } from './StoreValueEditor';
import { UnitDispatcher } from './UnitDispatcher';

interface StoreDetailsProps {
  unit: UnitInfo;
  value: Encoded | undefined;
  updateCount: number;
  /** every store value of the scope, for presets */
  values: Record<string, Encoded> | null;
}

export function StoreDetails({ unit, value, updateCount, values }: StoreDetailsProps) {
  const store = useStore();
  const { texts } = store;
  return (
    <>
      <div className="ih">
        <Glyph glyph={glyphClass(unit)} />
        <span className="t">{unit.name}</span>
        <span className="s">scope {store.scopeName(store.storesScopeId)}</span>
      </div>
      <div className="det">
        <StoreMeta unit={unit} updateCount={updateCount} />
        <div className="h3">{texts.value}</div>
        {value !== undefined ? (
          <div className="vt" style={{ padding: 0 }}>
            <ValueTree value={value} />
          </div>
        ) : (
          '…'
        )}
        {unit.writable ? (
          <StoreValueEditor key={unit.id} unit={unit} value={value} />
        ) : (
          <span className="hint">{texts.derivedHint}</span>
        )}
        <PresetsSection values={values} />
        <UnitDispatcher />
        <StoreHistory unitId={unit.id} />
      </div>
    </>
  );
}
