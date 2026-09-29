import { useMemo, useState } from 'react';
import { useStore } from '../common';
import { buildGraphView } from './buildGraphView';
import { GraphCanvas } from './GraphCanvas';
import { GraphPathBar } from './GraphPathBar';
import { findNodeIdByName, findPath } from './graphSearch';
import { GraphToolbar } from './GraphToolbar';
import type { PathSearch } from './pathSearch';
import { selectStepOrder } from './stepOrder';

const NO_STEP_ORDER: ReadonlyMap<string, number> = new Map();

/**
 * The unit graph around what is selected: the selected unit, the units of the selected transaction
 * (numbered in step order), a path between two units, or the units of a diagnostic.
 */
export function GraphView() {
  const store = useStore();
  const { graph, texts, ui } = store;
  const transaction = store.selectedTransaction();
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(() => new Set());
  const [pathSearch, setPathSearch] = useState<PathSearch>(null);
  const pathIds = pathSearch?.kind === 'found' ? pathSearch.unitIds : null;
  const focusIds = pathIds || ui.graphFocus;
  const stepOrder = transaction && !focusIds ? selectStepOrder(store, transaction) : NO_STEP_ORDER;
  const { showInternal, graphGroup, graphAll, graphDepth, selectedUnit } = ui;
  const view = useMemo(
    () =>
      graph &&
      buildGraphView({
        graph,
        showInternal,
        grouping: graphGroup,
        showAll: graphAll,
        depth: graphDepth,
        selectedUnit,
        focusIds,
        stepOrder,
        expandedGroups,
      }),
    [
      graph,
      showInternal,
      graphGroup,
      graphAll,
      graphDepth,
      selectedUnit,
      focusIds,
      stepOrder,
      expandedGroups,
    ],
  );

  const findPathBetween = (fromText: string, toText: string) => {
    if (!graph) return;
    const isKnownUnitId = (id: string) => store.units.has(id);
    const from = findNodeIdByName(graph.nodes, fromText, isKnownUnitId);
    const to = findNodeIdByName(graph.nodes, toText, isKnownUnitId);
    if (!from || !to) {
      setPathSearch({ kind: 'not-found' });
      return;
    }
    // the units may be connected either way round
    const path = findPath(graph.edges, from, to) || findPath(graph.edges, to, from);
    setPathSearch(path ? { kind: 'found', unitIds: path } : { kind: 'not-found' });
    if (path) store.setUI({ graphFocus: null });
  };

  const clearFocus = () => {
    setPathSearch(null);
    store.setUI({ graphFocus: null });
  };

  const toggleGroup = (key: string) =>
    setExpandedGroups((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <GraphToolbar onGroupingChange={() => setExpandedGroups(new Set())} />
      <GraphPathBar pathSearch={pathSearch} onFindPath={findPathBetween} onClear={clearFocus} />
      <div className="gwrap">
        {!view && <div className="empty">…</div>}
        {view?.kind === 'too-big' && (
          <div className="empty">
            {texts.graph.tooBig(view.nodeCount)}{' '}
            <button className="link" type="button" onClick={() => store.setUI({ graphAll: true })}>
              {texts.graph.showAll}
            </button>
          </div>
        )}
        {view?.kind === 'drawing' && (
          <GraphCanvas
            drawing={view}
            focusIds={focusIds}
            isPath={pathIds !== null}
            hasStepOrder={stepOrder.size > 0}
            onToggleGroup={toggleGroup}
          />
        )}
      </div>
    </div>
  );
}
