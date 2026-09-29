import type { Encoded } from '@deffector/protocol';
import { useStore } from '../common';
import { StoreRow } from './StoreRow';
import { selectAvailableGroups, selectStoreGroups, selectUpdateCounts } from './storeSelectors';

interface StoreListProps {
  selectedId: string | null;
  values: Record<string, Encoded> | null;
}

export function StoreList({ selectedId, values }: StoreListProps) {
  const store = useStore();
  const { texts } = store;
  const updateCounts = selectUpdateCounts(store);
  return (
    <div className="list">
      <div className="lhead" style={{ paddingLeft: 10 }}>
        {selectAvailableGroups(store).map((group) => (
          <button
            key={group}
            type="button"
            className={`chip${store.ui.storesGroup === group ? ' on' : ''}`}
            onClick={() => store.setUI({ storesGroup: group })}
          >
            {texts.storesGroup[group]}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          style={{ marginLeft: 'auto' }}
          onClick={() => store.setUI({ storesView: 'snapshot' })}
        >
          {texts.snapshot.title} →
        </button>
      </div>
      {selectStoreGroups(store).map(([group, members]) => (
        <div key={group} role="listbox">
          <div className="sgrp">{group}</div>
          {members.map((unit) => (
            <StoreRow
              key={unit.id}
              unit={unit}
              isSelected={selectedId === unit.id}
              hasValues={values !== null}
              value={values?.[unit.id]}
              updateCount={updateCounts.get(unit.id) || 0}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
