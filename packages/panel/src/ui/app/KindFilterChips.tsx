import { countByKind, LOG_KIND_FILTERS } from '../../store';
import { useStore } from '../common';

export function KindFilterChips() {
  const store = useStore();
  const { kindFilter } = store.ui;
  return (
    <>
      {LOG_KIND_FILTERS.map((kind) => (
        <button
          key={kind}
          type="button"
          className={`chip${kindFilter === kind ? ' on' : ''}`}
          aria-pressed={kindFilter === kind}
          onClick={() => store.setUI({ kindFilter: kind })}
        >
          {store.texts.kindFilters[kind]}
          <span className="cnt">{countByKind(store, kind)}</span>
        </button>
      ))}
    </>
  );
}
