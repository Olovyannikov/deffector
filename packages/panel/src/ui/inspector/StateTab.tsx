import type { Tx } from '@deffector/protocol';
import { NamedValueTree, useStore } from '../common';

/** Every store of the scope right after the transaction, the changed ones marked. */
export function StateTab({ transaction }: { transaction: Tx }) {
  const store = useStore();
  const values = store.scopeState.valuesFor(transaction.scopeId, transaction.id);
  if (!values) return <div className="empty">…</div>;
  const changedNodes = new Set(transaction.changes.map((change) => change.node));
  const shownIds = Object.keys(values)
    .filter((id) => {
      const unit = store.units.get(id);
      return !!unit && (store.ui.showInternal || !unit.internal);
    })
    .sort((left, right) => store.unitName(left).localeCompare(store.unitName(right)));
  return (
    <>
      <div className="hint" style={{ padding: '4px 10px 6px' }}>
        {store.texts.stateAt(store.scopeName(transaction.scopeId), transaction.id)}
      </div>
      {shownIds.map((id) => (
        <div
          key={id}
          className={changedNodes.has(id) ? 'kv chg' : 'kv'}
          style={{ display: 'block' }}
        >
          <NamedValueTree name={store.unitName(id)} value={values[id]} />
        </div>
      ))}
    </>
  );
}
