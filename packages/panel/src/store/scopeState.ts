import type { Encoded } from '@deffector/protocol';
import type { PanelStore } from './PanelStore';

/** Batches state requests while transactions stream in. */
const REFRESH_DELAY_MS = 120;

interface StateSnapshot {
  scopeId: string;
  /** null: the scope as it is now */
  txId: number | null;
  values: Record<string, Encoded>;
}

/**
 * Store values of one scope, fetched on demand: the Stores tab shows the scope now, the inspector's
 * State tab shows it right after the selected transaction. Only the latest answer is kept.
 */
export class ScopeStateCache {
  private snapshot: StateSnapshot | null = null;

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly store: PanelStore) {}

  /** Values of `scopeId` after transaction `txId` (null: now), if they are the ones last received. */
  valuesFor(scopeId: string, txId: number | null): Record<string, Encoded> | null {
    const { snapshot } = this;
    if (!snapshot || snapshot.scopeId !== scopeId || snapshot.txId !== txId) return null;
    return snapshot.values;
  }

  accept(snapshot: StateSnapshot) {
    this.snapshot = snapshot;
  }

  clear() {
    this.snapshot = null;
  }

  scheduleRefresh() {
    if (this.refreshTimer) return;
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      this.refresh();
    }, REFRESH_DELAY_MS);
  }

  /** Asks the agent for the values the open tab shows; the answer arrives as a `state` message. */
  refresh() {
    if (this.store.connection !== 'connected') return;
    const target = this.shownState();
    if (!target) return;
    void this.store.request((requestId) => ({ type: 'get-state', requestId, ...target }));
  }

  private shownState(): { scopeId: string; txId: number | null } | null {
    const { tab, inspectorTab } = this.store.ui;
    if (tab === 'stores') return { scopeId: this.store.storesScopeId, txId: null };
    if (tab !== 'log' || inspectorTab !== 'state') return null;
    const transaction = this.store.selectedTransaction();
    return transaction && { scopeId: transaction.scopeId, txId: transaction.id };
  }
}
