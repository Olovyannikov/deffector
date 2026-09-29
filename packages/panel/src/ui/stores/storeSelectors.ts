import type { Encoded, UnitInfo } from '@deffector/protocol';
import { createVersionedSelector, type PanelStore, type StoresGroup } from '../../store';

const STORES_GROUPS: readonly StoresGroup[] = ['file', 'factory', 'domain', 'model', 'kind'];
/** Changes listed in a store's history. */
const HISTORY_LENGTH = 10;

function groupKey(store: PanelStore, unit: UnitInfo): string {
  const { factory } = unit;
  switch (store.ui.storesGroup) {
    case 'factory': {
      if (!factory) return '—';
      const name = factory.name || factory.method || 'factory';
      return factory.file ? `${name} · ${factory.file}` : name;
    }
    case 'domain':
      return unit.domain || '—';
    case 'model':
      return unit.model || factory?.name || '—';
    case 'kind':
      return unit.derived ? 'derived' : 'store';
    default:
      return unit.file || store.texts.noFile;
  }
}

/** Stores the Stores tab lists: real, not disposed, internal ones only when asked for. */
export const selectStoreUnits = createVersionedSelector((store: PanelStore): UnitInfo[] =>
  [...store.units.values()].filter(
    (unit) =>
      unit.kind === 'store' &&
      unit.isUnit &&
      !unit.disposed &&
      (store.ui.showInternal || !unit.internal),
  ),
);

/** Stores grouped by the picked grouping, groups by name, stores by line and then name. */
export const selectStoreGroups = createVersionedSelector((store: PanelStore) => {
  const groups = new Map<string, UnitInfo[]>();
  for (const unit of selectStoreUnits(store)) {
    const key = groupKey(store, unit);
    const members = groups.get(key) ?? [];
    members.push(unit);
    groups.set(key, members);
  }
  for (const members of groups.values())
    members.sort(
      (left, right) => (left.line ?? 0) - (right.line ?? 0) || left.name.localeCompare(right.name),
    );
  return [...groups.entries()].sort((left, right) => left[0].localeCompare(right[0]));
});

/** Groupings that make sense for these stores: no Domain tab without domains, and so on. */
export const selectAvailableGroups = createVersionedSelector((store: PanelStore) => {
  const stores = selectStoreUnits(store);
  const hasDomains = stores.some((unit) => unit.domain);
  const hasModels = stores.some((unit) => unit.model || unit.factory);
  return STORES_GROUPS.filter(
    (group) => (group !== 'domain' || hasDomains) && (group !== 'model' || hasModels),
  );
});

/** How many recorded transactions changed each store. */
export const selectUpdateCounts = createVersionedSelector((store: PanelStore) => {
  const counts = new Map<string, number>();
  for (const transaction of store.txs)
    for (const change of transaction.changes)
      counts.set(change.node, (counts.get(change.node) || 0) + 1);
  return counts;
});

export interface StoreHistoryEntry {
  txId: number;
  from: Encoded;
  to: Encoded;
}

/** The latest changes of one store, newest first. */
export const selectStoreHistory = createVersionedSelector(
  (store: PanelStore, unitId: string): StoreHistoryEntry[] => {
    const history: StoreHistoryEntry[] = [];
    for (let i = store.txs.length - 1; i >= 0 && history.length < HISTORY_LENGTH; i--) {
      const transaction = store.txs[i];
      const change = transaction.changes.find((candidate) => candidate.node === unitId);
      if (change) history.push({ txId: transaction.id, from: change.from, to: change.to });
    }
    return history;
  },
);

/** Events and effects the user can call from the panel. */
export const selectDispatchableUnits = createVersionedSelector((store: PanelStore) =>
  [...store.units.values()]
    .filter(
      (unit) =>
        unit.isUnit &&
        (unit.kind === 'event' || unit.kind === 'effect') &&
        !unit.internal &&
        !unit.derived,
    )
    .sort((left, right) => left.name.localeCompare(right.name)),
);

/** The payload of the last call of a unit: a hint for the next one. */
export const selectLastPayload = createVersionedSelector(
  (store: PanelStore, unitId: string): Encoded | undefined =>
    store.txs.findLast(
      (transaction) => transaction.root === unitId && transaction.payload !== undefined,
    )?.payload,
);

/** Writable stores, the ones a snapshot holds. */
export const selectWritableStores = createVersionedSelector((store: PanelStore) =>
  [...store.units.values()].filter(
    (unit) => unit.kind === 'store' && unit.writable && !unit.internal,
  ),
);

/** The store shown in details: the selected unit if it is a store, else the first one listed. */
export function selectedStoreUnit(store: PanelStore): UnitInfo | undefined {
  const { selectedUnit } = store.ui;
  const selected = selectedUnit ? store.units.get(selectedUnit) : undefined;
  return selected?.kind === 'store' ? selected : selectStoreUnits(store)[0];
}
