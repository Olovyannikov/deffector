import type { Tx } from '@deffector/protocol';
import { copyText } from '../../clipboard';
import { dispatchUnit, toggleSkip, transactionLabel } from '../../store';
import { formatSeconds, Glyph, glyphClass, useStore, useTransientValue } from '../common';

const LINK_COPIED_MS = 1400;

interface InspectorHeaderProps {
  transaction: Tx;
  isNoteEditorOpen: boolean;
  onToggleNoteEditor: () => void;
}

/** Title of the selected transaction and what can be done with it. */
export function InspectorHeader({
  transaction,
  isNoteEditorOpen,
  onToggleNoteEditor,
}: InspectorHeaderProps) {
  const store = useStore();
  const { texts } = store;
  const [isLinkCopied, showLinkCopied] = useTransientValue<true>(LINK_COPIED_MS);
  const { cause, flags } = transaction;
  const root = store.units.get(transaction.root);
  const canAct = store.timeline.mode !== 'replay';
  const canRepeat = root?.kind === 'event' && !root.internal && !transaction.settle;
  // only what came from outside can be skipped: the rest follows from it
  const isExternal = !cause || (cause.kind === 'devtools' && cause.action !== 'jump');
  const canSkip =
    isExternal &&
    transaction.scopeId !== 'global' &&
    store.scopes.some((scope) => scope.switchable);
  const visibleStepCount = transaction.steps.filter((step) => !step.internal).length;
  const copyStepLink = async () => {
    await copyText(`#step=${transaction.id}`);
    showLinkCopied(true);
  };
  return (
    <div className="ih">
      <Glyph glyph={glyphClass(root)} />
      <span className="t">
        #{transaction.id} {transactionLabel(store, transaction)}
      </span>
      <span className="s">
        scope {store.scopeName(transaction.scopeId)} · +{formatSeconds(transaction.t)}s ·{' '}
        {texts.steps(visibleStepCount)} · {transaction.duration} ms
      </span>
      <div className="acts">
        <button
          className="btn"
          type="button"
          disabled={!canAct || flags.skipped}
          onClick={() => store.jump(transaction.id)}
        >
          {texts.jump}
        </button>
        <button
          className="btn"
          type="button"
          disabled={!canAct || !canRepeat || flags.outOfScope}
          onClick={() => {
            void dispatchUnit(store, transaction.root, transaction.payload ?? null);
          }}
        >
          {texts.repeat}
        </button>
        <button
          className="btn"
          type="button"
          disabled={!canAct || !canSkip}
          onClick={() => toggleSkip(store, transaction.id)}
        >
          {flags.skipped ? texts.unskip : texts.skip}
        </button>
        <button
          className="btn"
          type="button"
          aria-pressed={isNoteEditorOpen}
          onClick={onToggleNoteEditor}
        >
          {texts.note.add}
        </button>
        <button
          className="btn"
          type="button"
          title="#step"
          onClick={() => {
            void copyStepLink();
          }}
        >
          {isLinkCopied ? texts.note.copied : texts.note.link}
        </button>
      </div>
    </div>
  );
}
