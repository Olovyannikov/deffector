import type { MouseEvent } from 'react';
import type { Diagnostic } from '@deffector/protocol';
import { openSource, reclaimInspector } from '../../store';
import { useStore } from '../common';
import {
  isShownInGraph,
  openDiagnostic,
  parseLocation,
  showDiagnosticInGraph,
} from './diagnosticTargets';

function levelIcon(level: Diagnostic['level']): string {
  if (level === 'ok') return '✓';
  if (level === 'info') return 'i';
  return '!';
}

/** Buttons inside the row act on their own: the click must not also open the row. */
function own(action: () => void) {
  return (event: MouseEvent) => {
    event.stopPropagation();
    action();
  };
}

export function DiagnosticRow({ diagnostic }: { diagnostic: Diagnostic }) {
  const store = useStore();
  const { texts } = store;
  const { file } = diagnostic;
  const isInspectorConflict = diagnostic.code === 'inspector-conflict';
  const canShowInGraph = isShownInGraph(diagnostic);
  const open = () => openDiagnostic(store, diagnostic);
  return (
    // a list item that opens its transaction: role="button" would nest the buttons inside it and
    // clash with the e2e button locators, so the list semantics stay
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- see above
    <div
      role="listitem"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- see above
      tabIndex={0}
      className="hrow"
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter') open();
      }}
    >
      <span className={`hic ${diagnostic.level}`} aria-hidden="true">
        {levelIcon(diagnostic.level)}
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="htitle">{diagnostic.title}</span>
        {diagnostic.count > 1 && (
          <span className="hcnt">
            {texts.health.times(diagnostic.count)}
            {diagnostic.txId ? ` · ${texts.health.lastTransaction(diagnostic.txId)}` : ''}
          </span>
        )}
        {diagnostic.detail && <span className="hdet">{diagnostic.detail}</span>}
        {file && (
          <button
            type="button"
            className="hloc link"
            title={texts.openSource}
            onClick={own(() => {
              const location = parseLocation(file);
              void openSource(store, location.file, location.line);
            })}
          >
            {file}
          </button>
        )}
        {diagnostic.fix && <span className="hfix">{diagnostic.fix}</span>}
        {(isInspectorConflict || canShowInGraph) && (
          <span style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {isInspectorConflict && (
              <button
                className="btn pri"
                type="button"
                onClick={own(() => reclaimInspector(store))}
              >
                {texts.health.reclaim}
              </button>
            )}
            {canShowInGraph && (
              <button
                className="btn"
                type="button"
                onClick={own(() => showDiagnosticInGraph(store, diagnostic))}
              >
                {texts.healthActions.inGraph}
              </button>
            )}
          </span>
        )}
      </span>
    </div>
  );
}
