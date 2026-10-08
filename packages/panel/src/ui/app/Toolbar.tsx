import type { HelloInfo } from '@deffector/protocol';
import { clearLog, exportTraceToTracesTab, toggleLocale, toggleRecording } from '../../store';
import { Icon, RecordIcon, useStore } from '../common';
import { InternalNodesToggle } from './InternalNodesToggle';
import { KindFilterChips } from './KindFilterChips';
import { ScopeSelect } from './ScopeSelect';

export function Toolbar({ hello }: { hello: HelloInfo }) {
  const store = useStore();
  const { texts, ui } = store;
  const isRecording = store.timeline.recording;
  const recordLabel = isRecording ? texts.stopRecord : texts.record;
  return (
    <div className="tb" role="toolbar" aria-label="deffector">
      <button
        className={`ib${isRecording ? ' rec-on' : ''}`}
        type="button"
        aria-pressed={isRecording}
        title={recordLabel}
        aria-label={recordLabel}
        onClick={() => toggleRecording(store)}
      >
        <RecordIcon isRecording={isRecording} />
      </button>
      <button
        className="ib"
        type="button"
        title={texts.clear}
        aria-label={texts.clear}
        onClick={() => clearLog(store)}
      >
        <Icon name="clear" />
      </button>
      <span className="sep" />
      <ScopeSelect />
      <button
        className={`ib${store.savedFilters.items.length ? ' has' : ''}`}
        type="button"
        title={texts.filters.button}
        aria-label={texts.filters.button}
        onClick={() => store.setUI({ isFiltersMenuOpen: !ui.isFiltersMenuOpen })}
      >
        <Icon name="filter" />
      </button>
      <input
        className="inp flt"
        type="search"
        placeholder={texts.filter}
        aria-label={texts.filter}
        value={ui.nameFilter}
        onChange={(event) => store.setUI({ nameFilter: event.target.value })}
      />
      <KindFilterChips />
      <InternalNodesToggle />
      <span className="tb-status" title={hello.app.url}>
        {isRecording
          ? texts.status(hello.effector.version, store.units.size, store.txs.length)
          : texts.paused}
      </span>
      <button
        className="ib"
        type="button"
        title="Ctrl+K"
        aria-label="Ctrl+K"
        onClick={() => store.setUI({ isPaletteOpen: true })}
      >
        <Icon name="search" />
      </button>
      <button
        className="ib"
        type="button"
        title={texts.exportTrace}
        aria-label={texts.exportTrace}
        onClick={() => exportTraceToTracesTab(store)}
      >
        <Icon name="export" />
      </button>
      <button
        className="ib"
        type="button"
        title={texts.importTrace}
        aria-label={texts.importTrace}
        onClick={() => store.setUI({ tab: 'traces' })}
      >
        <Icon name="import" />
      </button>
      <button
        className="ib"
        type="button"
        title="Language / Язык"
        style={{ width: 'auto', padding: '0 6px', fontSize: 11 }}
        onClick={() => toggleLocale(store)}
      >
        {texts.lang}
      </button>
    </div>
  );
}
