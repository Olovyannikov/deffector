import { useEffect, useLayoutEffect, useRef, useState, type UIEvent } from 'react';
import type { Tx } from '@deffector/protocol';

/** Height of the `.lhead` row above the transactions. */
const HEADER_HEIGHT = 22;
/** Rows rendered above and below the visible ones, so fast scrolling does not show gaps. */
const OVERSCAN_ROWS = 10;

interface LogScrollOptions {
  rows: readonly Tx[];
  rowHeight: number;
  selectedId: number | null;
  /** time-travel cursor: while in the past the log does not follow new transactions */
  cursor: number | null;
}

/**
 * Virtual scrolling of the log: which rows to render, sticking to the bottom while new transactions
 * arrive, and bringing a newly selected row into view.
 */
export function useLogScroll({ rows, rowHeight, selectedId, cursor }: LogScrollOptions) {
  const listRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 400 });
  const isStuckToBottom = useRef(true);
  const scrolledToSelection = useRef<number | null | undefined>(undefined);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const observer = new ResizeObserver(() =>
      setViewport((previous) => ({ ...previous, height: list.clientHeight })),
    );
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && isStuckToBottom.current && cursor === null) list.scrollTop = list.scrollHeight;
  }, [rows.length, cursor]);

  useEffect(() => {
    // only a change of the selection scrolls: new rows must not pull the view back to it
    if (scrolledToSelection.current === selectedId) return;
    scrolledToSelection.current = selectedId;
    const list = listRef.current;
    if (selectedId === null || !list) return;
    const index = rows.findIndex((row) => row.id === selectedId);
    if (index < 0) return;
    const rowTop = HEADER_HEIGHT + index * rowHeight;
    const isAbove = rowTop < list.scrollTop + HEADER_HEIGHT;
    const isBelow = rowTop + rowHeight > list.scrollTop + list.clientHeight;
    if (isAbove || isBelow) list.scrollTop = Math.max(0, rowTop - list.clientHeight / 2);
  }, [selectedId, rows, rowHeight]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const list = event.currentTarget;
    isStuckToBottom.current =
      list.scrollTop + list.clientHeight >= list.scrollHeight - rowHeight * 2;
    setViewport({ scrollTop: list.scrollTop, height: list.clientHeight });
  };

  const firstRendered = Math.max(
    0,
    Math.floor((viewport.scrollTop - HEADER_HEIGHT) / rowHeight) - OVERSCAN_ROWS,
  );
  const lastRendered = Math.min(
    rows.length,
    Math.ceil((viewport.scrollTop + viewport.height) / rowHeight) + OVERSCAN_ROWS,
  );
  return { listRef, onScroll, firstRendered, lastRendered };
}
