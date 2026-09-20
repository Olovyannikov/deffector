import { useState } from 'react';
import { useStore } from '../common';
import { InspectorHeader } from './InspectorHeader';
import { InspectorTabBar } from './InspectorTabBar';
import { InspectorTabBody } from './InspectorTabBody';
import { NoteEditor } from './NoteEditor';

/** Details of the selected transaction, next to the log. */
export function Inspector() {
  const store = useStore();
  const transaction = store.selectedTransaction();
  /** the transaction whose note is being edited */
  const [noteEditorFor, setNoteEditorFor] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  if (!transaction)
    return (
      <div className="insp">
        <div className="empty">{store.texts.pickTx}</div>
      </div>
    );
  const isNoteEditorOpen = noteEditorFor === transaction.id;
  const toggleNoteEditor = () => {
    setNoteEditorFor(isNoteEditorOpen ? null : transaction.id);
    setNoteText(transaction.note || '');
  };
  return (
    <div className="insp">
      <InspectorHeader
        transaction={transaction}
        isNoteEditorOpen={isNoteEditorOpen}
        onToggleNoteEditor={toggleNoteEditor}
      />
      {isNoteEditorOpen && (
        <NoteEditor
          transaction={transaction}
          text={noteText}
          onTextChange={setNoteText}
          onClose={() => setNoteEditorFor(null)}
        />
      )}
      <InspectorTabBar />
      <div className="ibody">
        <InspectorTabBody transaction={transaction} />
      </div>
    </div>
  );
}
