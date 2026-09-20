import type { Tx } from '@deffector/protocol';
import { useStore, ValuePreview, ValueTree, withStableKeys } from '../common';

/** Store changes of the transaction; objects also open as a tree of the new value. */
export function DiffTab({ transaction }: { transaction: Tx }) {
  const store = useStore();
  if (!transaction.changes.length) return <div className="empty">{store.texts.noChanges}</div>;
  return (
    <>
      {withStableKeys(transaction.changes, (change) => change.node).map(({ key, item: change }) => (
        <div key={key}>
          <div className="kv">
            <span className="k">{store.unitName(change.node)}</span>
            <span className="del">
              <ValuePreview value={change.from} maxLength={60} />
            </span>
            <span>→</span>
            <span className="ins">
              <ValuePreview value={change.to} maxLength={60} />
            </span>
          </div>
          {change.to !== null && typeof change.to === 'object' && (
            <div className="vt" style={{ paddingLeft: 24 }}>
              <ValueTree value={change.to} />
            </div>
          )}
        </div>
      ))}
    </>
  );
}
