import { useId } from 'react';
import { nextFilterColor, type SavedFilter } from '../../store';
import { useStore } from '../common';

export function SavedFilterRow({ filter }: { filter: SavedFilter }) {
  const store = useStore();
  const texts = store.texts.filters;
  const { savedFilters } = store;
  const highlightId = useId();
  const dropId = useId();
  return (
    <div className="frow">
      <button
        type="button"
        className="swatch"
        style={{ background: filter.color }}
        aria-label="colour"
        title="colour"
        onClick={() => savedFilters.update(filter.id, { color: nextFilterColor(filter.color) })}
      />
      <span className="fname" title={filter.pattern}>
        {filter.name}
        <span className="mono fpat">/{filter.pattern}/</span>
      </span>
      <button
        className="btn"
        type="button"
        onClick={() => store.setUI({ nameFilter: filter.pattern, isFiltersMenuOpen: false })}
      >
        {texts.apply}
      </button>
      <label className="lbl" htmlFor={highlightId}>
        <input
          id={highlightId}
          type="checkbox"
          checked={filter.highlight}
          onChange={(event) => savedFilters.update(filter.id, { highlight: event.target.checked })}
        />
        {texts.highlight}
      </label>
      <label className="lbl" htmlFor={dropId} title={texts.dropHint}>
        <input
          id={dropId}
          type="checkbox"
          checked={filter.drop}
          onChange={(event) => savedFilters.update(filter.id, { drop: event.target.checked })}
        />
        {texts.drop}
      </label>
      <button
        className="ib"
        type="button"
        aria-label={texts.remove}
        title={texts.remove}
        onClick={() => savedFilters.remove(filter.id)}
      >
        ×
      </button>
    </div>
  );
}
