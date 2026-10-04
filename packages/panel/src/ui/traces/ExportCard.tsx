import { useId, useState } from 'react';
import { copyTextWithFallback } from '../../clipboard';
import { useStore, useTransientValue } from '../common';
import { downloadJson, traceFileName } from './downloadFile';

const COPIED_MS = 1500;

/** Builds a trace of the session; it can open at the selected transaction after a replay. */
export function ExportCard({ json }: { json: string }) {
  const store = useStore();
  const texts = store.texts.traces;
  const focusCheckboxId = useId();
  const [isCopied, showCopied] = useTransientValue<true>(COPIED_MS);
  const [opensAtSelection, setOpensAtSelection] = useState(true);
  const selectedId = store.ui.selectedTransactionId;
  const { exported } = store;
  const copyJson = async () => {
    if (await copyTextWithFallback(json)) showCopied(true);
  };
  return (
    <section className="card" aria-label={texts.exportTitle}>
      <div className="card-h">{texts.exportTitle}</div>
      <div className="card-b">
        <span className="hint">{texts.exportText}</span>
        <div className="flex">
          <button
            className="btn pri"
            type="button"
            onClick={() => {
              void store.exportTrace(
                opensAtSelection && selectedId !== null ? selectedId : undefined,
              );
            }}
          >
            {texts.build}
          </button>
          <button
            className="btn"
            type="button"
            disabled={!exported}
            onClick={() => downloadJson(traceFileName(store.hello?.app.name), json)}
          >
            {texts.download}
          </button>
          <button
            className="btn"
            type="button"
            disabled={!exported}
            onClick={() => {
              void copyJson();
            }}
          >
            {isCopied ? texts.copied : texts.copy}
          </button>
        </div>
        {selectedId !== null && (
          <label className="lbl" htmlFor={focusCheckboxId}>
            <input
              id={focusCheckboxId}
              type="checkbox"
              checked={opensAtSelection}
              onChange={(event) => setOpensAtSelection(event.target.checked)}
            />
            {texts.exportFocus(selectedId)}
          </label>
        )}
        {exported && (
          <>
            <div className="stats">
              <span>
                {texts.stats(
                  exported.trace.steps.length,
                  exported.trace.effectResults.length,
                  (new Blob([json]).size / 1024).toFixed(1),
                )}
              </span>
              {exported.trace.redacted.length > 0 && (
                <span>{texts.masked(exported.trace.redacted.length)}</span>
              )}
              {exported.trace.lossy.length > 0 && (
                <span>{texts.lossy(exported.trace.lossy.length)}</span>
              )}
            </div>
            <textarea
              className="ed big"
              readOnly
              aria-label="trace JSON"
              value={json}
              spellCheck={false}
            />
          </>
        )}
      </div>
    </section>
  );
}
