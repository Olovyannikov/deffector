import { onActivationKey } from '../common';
import type { PaletteItem } from './paletteItems';

interface PaletteRowProps {
  item: PaletteItem;
  isActive: boolean;
  onHover: () => void;
}

/** A result; the input keeps the focus and moves the active row with the arrow keys. */
export function PaletteRow({ item, isActive, onHover }: PaletteRowProps) {
  return (
    <div
      role="option"
      aria-selected={isActive}
      tabIndex={-1}
      className={`pal-row${isActive ? ' on' : ''}`}
      onMouseEnter={onHover}
      onClick={() => item.run()}
      onKeyDown={onActivationKey(item.run)}
    >
      {item.glyph ? (
        <span className={`g ${item.glyph}`} />
      ) : (
        <span className="pal-grp">{item.group}</span>
      )}
      <span className="pal-l">{item.label}</span>
      {item.hint && <span className="pal-h">{item.hint}</span>}
    </div>
  );
}
