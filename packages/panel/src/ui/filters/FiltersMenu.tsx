import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { useStore } from '../common';
import { SavedFilterRow } from './SavedFilterRow';

/** Saved filters: apply in one click, colour matching rows, or stop recording them at the source. */
export function FiltersMenu() {
  const store = useStore();
  const texts = store.texts.filters;
  const { nameFilter } = store.ui;
  const [name, setName] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => store.setUI({ isFiltersMenuOpen: false }), [store]);
  useEffect(() => {
    // Esc inside the menu closes it; listening on document lets the panel-wide shortcut on
    // window still see the key afterwards, as with a React handler on the menu
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dialogRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close]);
  const closeOnVeil = (event: MouseEvent) => {
    if (event.target === event.currentTarget) close();
  };
  return (
    <div className="pop-veil" role="presentation" onMouseDown={closeOnVeil}>
      <div className="pop" role="dialog" aria-label={texts.title} ref={dialogRef}>
        <div className="card-h">{texts.title}</div>
        <div className="card-b">
          {!store.savedFilters.items.length && <span className="hint">{texts.empty}</span>}
          {store.savedFilters.items.map((filter) => (
            <SavedFilterRow key={filter.id} filter={filter} />
          ))}
          <div className="flex">
            <input
              className="inp"
              placeholder={texts.name}
              aria-label={texts.name}
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={{ width: 120 }}
            />
            <span className="mono hint">/{nameFilter || '…'}/</span>
            <button
              className="btn pri"
              type="button"
              disabled={!nameFilter}
              onClick={() => {
                store.savedFilters.add(name, nameFilter);
                setName('');
              }}
            >
              {texts.save}
            </button>
          </div>
          <span className="hint">{texts.dropHint}</span>
        </div>
      </div>
    </div>
  );
}
