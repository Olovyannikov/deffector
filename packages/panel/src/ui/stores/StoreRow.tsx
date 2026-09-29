import type { Encoded, UnitInfo } from '@deffector/protocol';
import { Glyph, glyphClass, onActivationKey, useStore, ValuePreview } from '../common';

interface StoreRowProps {
  unit: UnitInfo;
  isSelected: boolean;
  /** false while the scope's values are loading */
  hasValues: boolean;
  value: Encoded | undefined;
  updateCount: number;
}

export function StoreRow({ unit, isSelected, hasValues, value, updateCount }: StoreRowProps) {
  const store = useStore();
  const { texts } = store;
  const select = () => store.setUI({ selectedUnit: unit.id });
  return (
    <div
      className={`row${isSelected ? ' sel' : ''}`}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={select}
      onKeyDown={onActivationKey(select)}
    >
      <span className="stripe" />
      <Glyph glyph={glyphClass(unit)} />
      <span className="c-name" style={{ width: 150 }}>
        {unit.name}
      </span>
      <span className="c-val">
        {hasValues ? <ValuePreview value={value} maxLength={80} /> : '…'}
      </span>
      {unit.derived && <span className="bdg info">derived</span>}
      {!unit.sid && !unit.internal && <span className="bdg warn">{texts.noSidBadge}</span>}
      {unit.serializeIgnore && <span className="bdg info">{texts.notSerialized}</span>}
      <span className="c-k">×{updateCount}</span>
    </div>
  );
}
