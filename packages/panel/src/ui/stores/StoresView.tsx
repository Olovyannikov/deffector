import { useEffect } from 'react';
import { useStore } from '../common';
import { SnapshotView } from './SnapshotView';
import { StoreDetails } from './StoreDetails';
import { StoreList } from './StoreList';
import { selectedStoreUnit, selectUpdateCounts } from './storeSelectors';

/** Stores of one scope with their values; details, editing and presets of the selected one. */
export function StoresView() {
  const store = useStore();
  const { storesScopeId } = store;
  const values = store.scopeState.valuesFor(storesScopeId, null);
  useEffect(() => {
    store.scopeState.refresh();
  }, [store, storesScopeId]);
  if (store.ui.storesView === 'snapshot') return <SnapshotView values={values} />;
  const selected = selectedStoreUnit(store);
  return (
    <div className="split">
      <StoreList selectedId={selected?.id ?? null} values={values} />
      <div className="insp">
        {selected ? (
          <StoreDetails
            unit={selected}
            value={values?.[selected.id]}
            updateCount={selectUpdateCounts(store).get(selected.id) || 0}
            values={values}
          />
        ) : (
          <div className="empty">—</div>
        )}
      </div>
    </div>
  );
}
