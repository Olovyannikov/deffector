import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useStore } from '../common';
import { selectPaletteItems } from './paletteItems';
import { PaletteRow } from './PaletteRow';
import { searchPalette } from './searchPalette';

/** Ctrl+K: find a tab, an action, a unit or a transaction by typing. */
export function Palette() {
  const store = useStore();
  const { texts } = store;
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = selectPaletteItems(store);
  const results = useMemo(() => searchPalette(items, query), [items, query]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const close = () => store.setUI({ isPaletteOpen: false });
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      // the panel-wide Esc would also leave the past
      event.stopPropagation();
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      results[activeIndex]?.run();
    }
  };
  const closeOnVeil = (event: MouseEvent) => {
    if (event.target === event.currentTarget) close();
  };
  return (
    <div className="pal-veil" role="presentation" onMouseDown={closeOnVeil}>
      <div className="pal" role="dialog" aria-label="Command palette">
        <input
          ref={inputRef}
          className="pal-in"
          placeholder={texts.palette.placeholder}
          aria-label={texts.palette.placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
        />
        <div className="pal-list" role="listbox">
          {results.map((item, index) => (
            <PaletteRow
              key={item.key}
              item={item}
              isActive={index === activeIndex}
              onHover={() => setActiveIndex(index)}
            />
          ))}
          {!results.length && <div className="empty">{texts.palette.empty}</div>}
        </div>
      </div>
    </div>
  );
}
