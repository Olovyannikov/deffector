import type { ReactNode } from 'react';
import { encode, preview } from '@deffector/protocol';
import type { Texts } from '../../i18n';
import { useStore } from '../common';
import type { SnapshotDiffEntry } from './snapshotDiff';

function renderDiff(entry: SnapshotDiffEntry, texts: Texts['snapshot']): ReactNode {
  if (!entry.unit) return <span className="errtxt">{texts.unknown}</span>;
  if (entry.isSame) return <span className="hint">{texts.same}</span>;
  return (
    <>
      <span className="del">{preview(encode(entry.current), 50)}</span>
      <span>→</span>
      <span className="ins">{preview(encode(entry.pasted), 60)}</span>
    </>
  );
}

/** A pasted key: the store it names and what applying the snapshot would change. */
export function SnapshotDiffRow({ entry }: { entry: SnapshotDiffEntry }) {
  const { texts } = useStore();
  const isChange = !!entry.unit && !entry.isSame;
  return (
    <div className={`kv${isChange ? ' chg' : ''}`} role="row">
      <span className="k">{entry.unit ? entry.unit.name : entry.key}</span>
      {renderDiff(entry, texts.snapshot)}
    </div>
  );
}
