import { useMemo, useState } from 'react';
import { encode, type Encoded } from '@deffector/protocol';
import { copyText } from '../../clipboard';
import { applySnapshot, type EditMode } from '../../store';
import { useStore, useTransientValue } from '../common';
import { currentSnapshot, diffSnapshot, parseSnapshot } from './snapshotDiff';
import { SnapshotDiffRow } from './SnapshotDiffRow';
import { selectWritableStores } from './storeSelectors';

const COPIED_MS = 1400;

/** A snapshot of every writable store as { sid: value }: copy it, or paste one and see the diff first. */
export function SnapshotView({ values }: { values: Record<string, Encoded> | null }) {
  const store = useStore();
  const { texts } = store;
  const [text, setText] = useState('');
  const [isCopied, showCopied] = useTransientValue<true>(COPIED_MS);
  const writableStores = selectWritableStores(store);
  const current = useMemo(() => currentSnapshot(writableStores, values), [writableStores, values]);
  const parsed = useMemo(() => parseSnapshot(text, texts.invalidJson), [text, texts.invalidJson]);
  const entries = useMemo(
    () => (parsed && 'value' in parsed ? diffSnapshot(parsed.value, writableStores, values) : []),
    [parsed, writableStores, values],
  );
  const changes = entries.filter((entry) => entry.unit && !entry.isSame);
  const canFork = store.scopes.some((scope) => scope.switchable);
  const apply = (mode: EditMode) => {
    const changedValues: Record<string, Encoded> = {};
    for (const entry of changes) changedValues[entry.unit!.id] = encode(entry.pasted);
    void applySnapshot(store, changedValues, mode);
    setText('');
  };
  const copyCurrent = async () => {
    await copyText(JSON.stringify(current, null, 2));
    showCopied(true);
  };
  return (
    <div className="det" style={{ flex: 1 }}>
      <div className="flex">
        <button type="button" className="chip" onClick={() => store.setUI({ storesView: 'list' })}>
          ← {texts.snapshot.list}
        </button>
        <span className="h3" style={{ margin: 0 }}>
          {texts.snapshot.title} · scope {store.scopeName(store.storesScopeId)}
        </span>
      </div>
      <div className="flex">
        <button
          className="btn"
          type="button"
          disabled={!values}
          onClick={() => {
            void copyCurrent();
          }}
        >
          {isCopied ? texts.snapshot.copied : texts.snapshot.copy}
        </button>
        <span className="hint">{texts.snapshot.copyHint}</span>
      </div>
      <textarea
        className="ed big"
        aria-label={texts.snapshot.paste}
        placeholder={texts.snapshot.paste}
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
      />
      {parsed && 'error' in parsed && <span className="errtxt">{parsed.error}</span>}
      {!parsed && <span className="hint">{texts.snapshot.empty}</span>}
      {entries.length > 0 && (
        <>
          <div className="h3">{texts.snapshot.preview(changes.length)}</div>
          <div className="snapdiff" role="table">
            {entries.map((entry) => (
              <SnapshotDiffRow key={entry.key} entry={entry} />
            ))}
          </div>
          <div className="flex">
            <button
              className="btn pri"
              type="button"
              disabled={!changes.length}
              onClick={() => apply('live')}
            >
              {texts.snapshot.apply}
            </button>
            <button
              className="btn"
              type="button"
              disabled={!changes.length || !canFork}
              onClick={() => apply('silent')}
            >
              {texts.snapshot.silent}
            </button>
          </div>
          <span className="hint">{texts.editHint}</span>
        </>
      )}
    </div>
  );
}
