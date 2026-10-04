import { copyTextWithFallback } from '../../clipboard';
import { useStore, useTransientValue } from '../common';

const COPIED_MS = 1500;

/** A test generated from the exported trace: fork with mocked effects, allSettled per step. */
export function TestCard({ test }: { test: string }) {
  const texts = useStore().texts.traces;
  const [isCopied, showCopied] = useTransientValue<true>(COPIED_MS);
  const copyTest = async () => {
    if (await copyTextWithFallback(test)) showCopied(true);
  };
  return (
    <section className="card" aria-label={texts.testTitle}>
      <div className="card-h">{texts.testTitle}</div>
      <div className="card-b">
        <span className="hint">{texts.testText}</span>
        <div className="flex">
          <button
            className="btn"
            type="button"
            onClick={() => {
              void copyTest();
            }}
          >
            {isCopied ? texts.copied : texts.test}
          </button>
        </div>
        <textarea className="ed big" readOnly aria-label="test" value={test} spellCheck={false} />
      </div>
    </section>
  );
}
