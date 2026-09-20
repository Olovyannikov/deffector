import { useEffect, useRef } from 'react';
import type { Tx } from '@deffector/protocol';
import { setTransactionNote } from '../../store';
import { useStore } from '../common';

interface NoteEditorProps {
  transaction: Tx;
  text: string;
  onTextChange: (text: string) => void;
  onClose: () => void;
}

/** A note on a transaction: the agent keeps it and exported traces carry it. */
export function NoteEditor({ transaction, text, onTextChange, onClose }: NoteEditorProps) {
  const store = useStore();
  const { note: texts } = store.texts;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);
  const save = (note: string) => {
    setTransactionNote(store, transaction.id, note);
    onClose();
  };
  return (
    <div className="noteed">
      <textarea
        ref={textareaRef}
        className="ed"
        aria-label={texts.add}
        placeholder={texts.placeholder}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
      />
      <div className="flex">
        <button className="btn pri" type="button" onClick={() => save(text)}>
          {texts.save}
        </button>
        {transaction.note && (
          <button className="btn" type="button" onClick={() => save('')}>
            {texts.remove}
          </button>
        )}
      </div>
    </div>
  );
}
