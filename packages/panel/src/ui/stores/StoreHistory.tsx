import { onActivationKey, useStore, ValuePreview } from '../common';
import { selectStoreHistory } from './storeSelectors';

/** The latest changes of a store; each opens its transaction in the log. */
export function StoreHistory({ unitId }: { unitId: string }) {
  const store = useStore();
  const history = selectStoreHistory(store, unitId);
  return (
    <>
      <div className="h3">{store.texts.history}</div>
      {history.map((entry) => {
        const openTransaction = () =>
          store.setUI({ tab: 'log', selectedTransactionId: entry.txId });
        return (
          <div
            key={entry.txId}
            className="kv"
            style={{ padding: 0, cursor: 'pointer' }}
            role="link"
            tabIndex={0}
            onClick={openTransaction}
            onKeyDown={onActivationKey(openTransaction)}
          >
            <span className="k">#{entry.txId}</span>
            <span className="del">
              <ValuePreview value={entry.from} maxLength={30} />
            </span>
            <span>→</span>
            <span className="ins">
              <ValuePreview value={entry.to} maxLength={30} />
            </span>
          </div>
        );
      })}
      {!history.length && <span className="hint">{store.texts.neverChanged}</span>}
    </>
  );
}
