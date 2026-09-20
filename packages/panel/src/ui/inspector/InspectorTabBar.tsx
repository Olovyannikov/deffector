import { INSPECTOR_TAB_IDS } from '../../store';
import { useStore } from '../common';

export function InspectorTabBar() {
  const store = useStore();
  const { inspectorTab } = store.ui;
  return (
    <div className="itabs" role="tablist">
      {INSPECTOR_TAB_IDS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={inspectorTab === tab}
          className={inspectorTab === tab ? 'on' : ''}
          onClick={() => {
            store.setUI({ inspectorTab: tab });
            if (tab === 'state') store.scopeState.refresh();
          }}
        >
          {store.texts.inspectorTabs[tab]}
        </button>
      ))}
    </div>
  );
}
