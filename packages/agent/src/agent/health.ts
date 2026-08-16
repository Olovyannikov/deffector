import type { Diagnostics } from '../diagnostics';
import type { History } from '../history';
import { canSetTimers, unrefTimer } from '../platform';
import type { Registry } from '../registry';
import { GLOBAL_ID, type Scopes } from '../scopes';
import { findInconsistentDerivedStores } from './consistency';
import { findCycles } from './cycles';
import { buildGraph } from './graph';
import type { PanelConnection } from './panelConnection';

/** a transaction with an error is followed by more: compare once things settle */
const CONSISTENCY_DELAY_MS = 50;

/** units are often created in bursts (a lazy chunk): scan the graph once they are all there */
const STATIC_SCAN_DELAY_MS = 1500;

export interface HealthParts {
  registry: Registry;
  scopes: Scopes;
  history: History;
  diagnostics: Diagnostics;
  connection: PanelConnection;
  onInternalError(error: unknown): void;
}

/** Health checks that look at the whole graph or a whole scope, and when they run. */
export class HealthMonitor {
  private consistencyTimer: ReturnType<typeof setTimeout> | null = null;

  private staticScanTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly parts: HealthParts) {}

  refreshStaticDiagnostics() {
    this.parts.diagnostics.refreshStatic(this.parts.history.transactions.length > 0);
  }

  scheduleConsistencyCheck(scopeId: string) {
    if (this.consistencyTimer || !canSetTimers()) return;
    this.consistencyTimer = setTimeout(() => {
      this.consistencyTimer = null;
      try {
        this.checkConsistency(scopeId);
      } catch (error) {
        this.parts.onInternalError(error);
      }
    }, CONSISTENCY_DELAY_MS);
    unrefTimer(this.consistencyTimer);
  }

  scheduleStaticScan() {
    if (this.staticScanTimer || !canSetTimers()) return;
    this.staticScanTimer = setTimeout(() => {
      this.staticScanTimer = null;
      try {
        this.scanCycles();
        this.refreshStaticDiagnostics();
        this.parts.connection.scheduleFlush();
      } catch (error) {
        this.parts.onInternalError(error);
      }
    }, STATIC_SCAN_DELAY_MS);
    unrefTimer(this.staticScanTimer);
  }

  /** Derived stores of a scope that disagree with a recomputation from their sources. */
  checkConsistency(scopeId: string): string[] {
    const { registry, scopes, diagnostics, connection } = this.parts;
    const scope = scopes.get(scopeId);
    if (scopeId !== GLOBAL_ID && !scope) return [];
    const mismatched = findInconsistentDerivedStores(registry, scope);
    diagnostics.reportConsistency(mismatched);
    connection.scheduleFlush();
    return mismatched;
  }

  /** Cycles in the static graph, and whether they pass a store. */
  scanCycles() {
    const { registry, diagnostics } = this.parts;
    const isStore = (id: string) => registry.get(id)?.info.kind === 'store';
    diagnostics.cycles = findCycles(buildGraph(registry), isStore);
  }
}
