import type { UnitInfo } from '@deffector/protocol';
import { openSource } from '../../store';
import { formatLocation, useStore } from '../common';

/** Key facts of a store: kind, sid, where it is declared, how it was made, how often it changed. */
export function StoreMeta({ unit, updateCount }: { unit: UnitInfo; updateCount: number }) {
  const store = useStore();
  const { texts } = store;
  const { file, factory } = unit;
  return (
    <div className="meta">
      <span className="k">{texts.kind}</span>
      <span>{unit.derived ? texts.derived : texts.writable}</span>
      <span className="k">{texts.sid}</span>
      <span>{unit.sid || texts.noSid}</span>
      <span className="k">{texts.file}</span>
      <span>
        {file ? (
          <button
            type="button"
            className="link"
            title={texts.openSource}
            onClick={() => {
              void openSource(store, file, unit.line);
            }}
          >
            {formatLocation(file, unit.line)}
          </button>
        ) : (
          texts.noFile
        )}
      </span>
      {factory && (
        <>
          <span className="k">factory</span>
          <span>{factory.name || factory.method}</span>
        </>
      )}
      {unit.domain && (
        <>
          <span className="k">domain</span>
          <span>{unit.domain}</span>
        </>
      )}
      {unit.model && (
        <>
          <span className="k">model</span>
          <span>{unit.model}</span>
        </>
      )}
      {unit.serializeIgnore && (
        <>
          <span className="k">serialize</span>
          <span>ignore</span>
        </>
      )}
      <span className="k">{texts.updates}</span>
      <span>{updateCount}</span>
    </div>
  );
}
