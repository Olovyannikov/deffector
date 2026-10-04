import {
  checkConsistency,
  clearLog,
  commitHistory,
  createVersionedSelector,
  exportTraceToTracesTab,
  revertHistory,
  TAB_IDS,
  toggleLocale,
  toggleRecording,
  transactionLabel,
  type PanelStore,
} from '../../store';
import { glyphClass } from '../common';

/** The newest transactions the palette can find by name. */
const MAX_TRANSACTIONS = 300;

export interface PaletteItem {
  /** `tab:…`, `act:…`, `unit:…` or `tx:…` */
  key: string;
  group: string;
  label: string;
  hint?: string;
  /** units show their kind mark instead of the group name */
  glyph?: string;
  /** closes the palette, then does the thing */
  run: () => void;
}

interface Action {
  id: string;
  label: string;
  perform: () => void;
  shortcut?: string;
}

function actions(store: PanelStore): Action[] {
  const labels = store.texts.actions;
  return [
    { id: 'record', label: labels.record, perform: () => toggleRecording(store) },
    { id: 'clear', label: labels.clear, perform: () => clearLog(store), shortcut: 'Ctrl+L' },
    {
      id: 'export',
      label: labels.export,
      perform: () => exportTraceToTracesTab(store),
      shortcut: 'Ctrl+S',
    },
    { id: 'import', label: labels.import, perform: () => store.setUI({ tab: 'traces' }) },
    { id: 'commit', label: labels.commit, perform: () => commitHistory(store) },
    { id: 'revert', label: labels.revert, perform: () => revertHistory(store) },
    { id: 'live', label: labels.live, perform: () => store.jump(null), shortcut: 'Esc' },
    { id: 'lock', label: labels.lock, perform: () => store.setLock(!store.timeline.locked) },
    {
      id: 'consistency',
      label: labels.consistency,
      perform: () => {
        store.setUI({ tab: 'health' });
        void checkConsistency(store);
      },
    },
    { id: 'lang', label: labels.lang, perform: () => toggleLocale(store) },
  ];
}

/** Everything the palette can do: tabs, actions, units, recent transactions. */
export const selectPaletteItems = createVersionedSelector((store: PanelStore): PaletteItem[] => {
  const { texts } = store;
  const closingFirst = (perform: () => void) => () => {
    store.setUI({ isPaletteOpen: false });
    perform();
  };
  const items: PaletteItem[] = TAB_IDS.map((tab, index) => ({
    key: `tab:${tab}`,
    group: texts.palette.tabs,
    label: texts.tabs[tab],
    hint: String(index + 1),
    run: closingFirst(() => store.setUI({ tab })),
  }));
  for (const action of actions(store))
    items.push({
      key: `act:${action.id}`,
      group: texts.palette.actions,
      label: action.label,
      hint: action.shortcut,
      run: closingFirst(action.perform),
    });
  for (const unit of store.units.values()) {
    if (!unit.isUnit || unit.internal || unit.kind === 'domain') continue;
    items.push({
      key: `unit:${unit.id}`,
      group: texts.palette.units,
      label: unit.name,
      hint: unit.file,
      glyph: glyphClass(unit),
      run: closingFirst(() =>
        store.setUI(
          unit.kind === 'store'
            ? { tab: 'stores', selectedUnit: unit.id, storesView: 'list' }
            : { tab: 'graph', selectedUnit: unit.id, graphFocus: [unit.id] },
        ),
      ),
    });
  }
  const { txs } = store;
  for (let i = txs.length - 1; i >= 0 && i >= txs.length - MAX_TRANSACTIONS; i--) {
    const transaction = txs[i];
    items.push({
      key: `tx:${transaction.id}`,
      group: texts.palette.txs,
      label: `#${transaction.id} ${transactionLabel(store, transaction)}`,
      run: closingFirst(() => store.setUI({ tab: 'log', selectedTransactionId: transaction.id })),
    });
  }
  return items;
});
