import type { KeyboardEvent, MouseEvent } from 'react';
import { selectLogTransactions } from '../../store';
import { useStore } from '../common';
import { LogRow } from './LogRow';
import { useLogScroll } from './useLogScroll';

/** Id of the row under the pointer: rows carry it in `data-transaction-id`. */
function clickedTransactionId(event: MouseEvent): number | null {
  const row = (event.target as Element).closest<HTMLElement>('[data-transaction-id]');
  return row ? Number(row.dataset.transactionId) : null;
}

/**
 * The transaction log. The list is a listbox that owns focus, clicks and keys: rows are its options
 * (click selects, double click or Enter jumps there in time, arrows move the selection).
 */
export function LogView({ rowHeight }: { rowHeight: number }) {
  const store = useStore();
  const { texts } = store;
  const rows = selectLogTransactions(store);
  const selected = store.selectedTransaction();
  const { cursor } = store.timeline;
  const { listRef, onScroll, firstRendered, lastRendered } = useLogScroll({
    rows,
    rowHeight,
    selectedId: selected?.id ?? null,
    cursor,
  });

  const onKeyDown = (event: KeyboardEvent) => {
    if (!rows.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const current = selected ? rows.findIndex((row) => row.id === selected.id) : rows.length - 1;
      const next = current + (event.key === 'ArrowDown' ? 1 : -1);
      store.setUI({ selectedTransactionId: rows[Math.max(0, Math.min(rows.length - 1, next))].id });
    } else if (event.key === 'Enter' && selected) {
      store.jump(selected.id);
    }
  };

  const onClick = (event: MouseEvent) => {
    const id = clickedTransactionId(event);
    if (id !== null) store.setUI({ selectedTransactionId: id });
  };

  const onDoubleClick = (event: MouseEvent) => {
    const id = clickedTransactionId(event);
    if (id !== null) store.jump(id);
  };

  if (!store.txs.length)
    return (
      <div className="list">
        <div className="empty">{texts.emptyLog}</div>
      </div>
    );
  return (
    <div
      className="list"
      ref={listRef}
      onScroll={onScroll}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      role="listbox"
      aria-label={texts.tabs.log}
    >
      <div className="lhead">
        <span className="stripe" />
        <span className="c-n">#</span>
        <span className="c-t">{texts.time}</span>
        <span>{texts.transaction}</span>
      </div>
      {!rows.length && (
        <div className="empty">
          {texts.noMatch}{' '}
          <button
            className="link"
            type="button"
            onClick={() => store.setUI({ nameFilter: '', kindFilter: 'all', scopeFilter: 'all' })}
          >
            {texts.resetFilter}
          </button>
        </div>
      )}
      <div style={{ height: firstRendered * rowHeight }} />
      {rows.slice(firstRendered, lastRendered).map((transaction) => (
        <LogRow
          key={transaction.id}
          transaction={transaction}
          isSelected={selected?.id === transaction.id}
          isFuture={cursor !== null && transaction.id > cursor}
        />
      ))}
      <div style={{ height: (rows.length - lastRendered) * rowHeight }} />
    </div>
  );
}
