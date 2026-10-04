import { useId, useRef, type ChangeEvent } from 'react';
import { useStore, withStableKeys } from '../common';

/** Paste or open a trace, check it against the current build, replay it. */
export function ImportCard() {
  const store = useStore();
  const texts = store.texts.traces;
  const { traceImport } = store;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const focusInputId = useId();
  const checkAndAdoptFocus = async () => {
    await traceImport.check();
    traceImport.adoptTraceFocus();
  };
  const openFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    traceImport.setText(await file.text());
    await checkAndAdoptFocus();
    // the same file can be opened again
    input.value = '';
  };
  const { compatibility } = traceImport;
  const canReplay = !!traceImport.trace && store.timeline.mode !== 'replay';
  return (
    <section className="card" aria-label={texts.importTitle}>
      <div className="card-h">{texts.importTitle}</div>
      <div className="card-b">
        <span className="hint">{texts.importText}</span>
        <div className="flex">
          <button className="btn" type="button" onClick={() => fileInputRef.current?.click()}>
            {texts.open}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              void openFile(event);
            }}
          />
          <button
            className="btn"
            type="button"
            disabled={!traceImport.text.trim()}
            onClick={() => {
              void checkAndAdoptFocus();
            }}
          >
            {texts.check}
          </button>
          <label className="lbl" htmlFor={focusInputId}>
            {texts.focus}
            <input
              id={focusInputId}
              className="inp mono"
              style={{ width: 110 }}
              aria-label={texts.focus}
              placeholder="#step=142"
              title={texts.focusHint}
              value={traceImport.focusStep === null ? '' : `#step=${traceImport.focusStep}`}
              onChange={(event) => traceImport.setFocusStep(event.target.value)}
            />
          </label>
        </div>
        <textarea
          className="ed big"
          aria-label="trace to import"
          value={traceImport.text}
          onChange={(event) => traceImport.setText(event.target.value)}
          spellCheck={false}
          placeholder='{ "format": "deffector-trace@1", … }'
        />
        {compatibility && (
          <>
            <div className="h3">{compatibility.title}</div>
            {withStableKeys(compatibility.rows, (row) => `${row.level}:${row.text}`).map(
              ({ key, item: row }) => (
                <div key={key} className="rep">
                  <span className={`dotl ${row.level}`} />
                  <span>{row.text}</span>
                </div>
              ),
            )}
            <div className="flex">
              <button
                className="btn pri"
                type="button"
                disabled={!canReplay}
                onClick={() => {
                  void traceImport.replay('animated');
                }}
              >
                {texts.replay}
              </button>
              <button
                className="btn"
                type="button"
                disabled={!canReplay}
                onClick={() => {
                  void traceImport.replay('instant');
                }}
              >
                {texts.instant}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
