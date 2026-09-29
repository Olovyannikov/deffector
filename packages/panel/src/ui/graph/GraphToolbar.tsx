import { useId } from 'react';
import type { GraphGroup } from '../../store';
import { useStore } from '../common';
import { GraphLegend } from './GraphLegend';

const DEPTHS = [1, 2, 3, 4, 6];
const GROUPINGS: readonly GraphGroup[] = ['none', 'file', 'factory', 'domain', 'model'];

/** Search, neighbourhood depth, grouping and what to draw. */
export function GraphToolbar({ onGroupingChange }: { onGroupingChange: () => void }) {
  const store = useStore();
  const { texts, ui } = store;
  const depthId = useId();
  const groupId = useId();
  const operatorsId = useId();
  const showAllId = useId();
  return (
    <div className="gtool">
      <input
        className="inp"
        placeholder={texts.graph.search}
        aria-label={texts.graph.search}
        value={ui.graphQuery}
        onChange={(event) => store.setUI({ graphQuery: event.target.value })}
        style={{ width: 140 }}
      />
      <label className="lbl" htmlFor={depthId}>
        {texts.graph.depth}
        <select
          id={depthId}
          className="inp"
          value={ui.graphDepth}
          onChange={(event) => store.setUI({ graphDepth: Number(event.target.value) })}
        >
          {DEPTHS.map((depth) => (
            <option key={depth} value={depth}>
              ±{depth}
            </option>
          ))}
        </select>
      </label>
      <label className="lbl" htmlFor={groupId}>
        {texts.graphTools.group}
        <select
          id={groupId}
          className="inp"
          value={ui.graphGroup}
          onChange={(event) => {
            onGroupingChange();
            store.setUI({ graphGroup: event.target.value as GraphGroup });
          }}
        >
          {GROUPINGS.map((grouping) => (
            <option key={grouping} value={grouping}>
              {texts.graphTools.groups[grouping]}
            </option>
          ))}
        </select>
      </label>
      <label className="lbl" htmlFor={operatorsId}>
        <input
          id={operatorsId}
          type="checkbox"
          checked={ui.showGraphOperators}
          onChange={(event) => store.setUI({ showGraphOperators: event.target.checked })}
        />
        {texts.graphTools.ops}
      </label>
      <label className="lbl" htmlFor={showAllId}>
        <input
          id={showAllId}
          type="checkbox"
          checked={ui.graphAll}
          onChange={(event) => store.setUI({ graphAll: event.target.checked })}
        />
        {texts.graph.all}
      </label>
      <button className="btn" type="button" onClick={() => store.loadGraph()} aria-label="refresh">
        ↻
      </button>
      <GraphLegend />
    </div>
  );
}
