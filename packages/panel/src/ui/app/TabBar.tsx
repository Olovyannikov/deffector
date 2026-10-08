import { TAB_IDS } from '../../store';
import { useStore } from '../common';

/** The panel tabs; Health carries the number of errors, or of warnings when there are none. */
export function TabBar() {
  const store = useStore();
  const { texts } = store;
  const errorCount = store.diagnostics.filter((diagnostic) => diagnostic.level === 'error').length;
  const warningCount = store.diagnostics.filter(
    (diagnostic) => diagnostic.level === 'warning',
  ).length;
  return (
    <div className="pt" role="tablist">
      {TAB_IDS.map((tab, index) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={store.ui.tab === tab}
          className={store.ui.tab === tab ? 'on' : ''}
          onClick={() => store.setUI({ tab })}
          title={`${texts.tabs[tab]} (${index + 1})`}
        >
          {texts.tabs[tab]}
          {tab === 'health' && (errorCount > 0 || warningCount > 0) && (
            <span className={`cbadge${errorCount ? '' : ' warn'}`}>
              {errorCount || warningCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
