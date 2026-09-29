import { useId, useState } from 'react';
import { useStore } from '../common';
import { pathHint, type PathSearch } from './pathSearch';

/** Suggestions for From and To: enough to find a unit, not so many that the input lags. */
const MAX_SUGGESTIONS = 2000;

interface GraphPathBarProps {
  pathSearch: PathSearch;
  onFindPath: (fromText: string, toText: string) => void;
  onClear: () => void;
}

/** "Path" between two units by name, and what the graph currently highlights. */
export function GraphPathBar({ pathSearch, onFindPath, onClear }: GraphPathBarProps) {
  const store = useStore();
  const { texts, ui } = store;
  const fromId = useId();
  const toId = useId();
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  return (
    <div className="gtool">
      <datalist id="graph-units">
        {store.graph?.nodes
          .filter((node) => !node.internal)
          .slice(0, MAX_SUGGESTIONS)
          .map((node) => (
            // eslint-disable-next-line jsx-a11y/control-has-associated-label -- a datalist suggestion: its value is the text, the inputs carry the labels
            <option key={node.id} value={node.name} />
          ))}
      </datalist>
      <label className="lbl" htmlFor={fromId}>
        {texts.graphTools.from}
        <input
          id={fromId}
          className="inp"
          list="graph-units"
          value={fromText}
          onChange={(event) => setFromText(event.target.value)}
          style={{ width: 150 }}
          aria-label={texts.graphTools.from}
        />
      </label>
      <label className="lbl" htmlFor={toId}>
        {texts.graphTools.to}
        <input
          id={toId}
          className="inp"
          list="graph-units"
          value={toText}
          onChange={(event) => setToText(event.target.value)}
          style={{ width: 150 }}
          aria-label={texts.graphTools.to}
        />
      </label>
      <button className="btn" type="button" onClick={() => onFindPath(fromText, toText)}>
        {texts.graphTools.path}
      </button>
      {(pathSearch || ui.graphFocus) && (
        <button className="btn" type="button" onClick={onClear}>
          {texts.graphTools.clear}
        </button>
      )}
      <span className="hint">
        {pathHint(texts, pathSearch, store.selectedTransaction(), ui.graphFocus)}
        {ui.graphGroup !== 'none' ? ` · ${texts.graphTools.expand}` : ''}
      </span>
    </div>
  );
}
