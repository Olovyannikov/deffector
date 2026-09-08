import type { Collector } from '../collector';
import type { Diagnostics } from '../diagnostics';
import {
  createNode,
  installGraphInspector,
  installInspector,
  launch,
  type GraphInspectorFn,
  type Node,
  type Scope,
} from '../effector';
import type { Registry } from '../registry';
import type { Scopes } from '../scopes';
import type { HealthMonitor } from './health';
import type { PanelConnection } from './panelConnection';

/** how often a connected panel checks that the inspector is still ours */
const PROBE_INTERVAL_MS = 4000;

export interface InspectorSlotParts {
  collector: Collector;
  registry: Registry;
  scopes: Scopes;
  diagnostics: Diagnostics;
  health: HealthMonitor;
  connection: PanelConnection;
  onInternalError(error: unknown): void;
}

/**
 * effector has one inspector slot and one graph inspector slot; whoever sets
 * last wins (effector/inspect, used by effector-logger, takes them too). A probe
 * node launched now and then tells whether our inspector still gets the steps.
 */
export class InspectorSlot {
  private probe: Node | null = null;

  private isProbeSeen = false;

  private probeTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly parts: InspectorSlotParts) {}

  /** Install (or reclaim) both kernel hooks. */
  install() {
    this.probe = this.probe || createNode({ meta: { deffectorProbe: true } });
    const { probe } = this;
    const { inspector } = this.parts.collector;
    installInspector((stack, local, kernelSkipped, launchId) => {
      if (stack.node === probe) {
        this.isProbeSeen = true;
        return;
      }
      inspector(stack, local, kernelSkipped, launchId);
    });
    installGraphInspector(this.onGraphEvent);
    this.parts.diagnostics.hasInspectorConflict = false;
  }

  /** Check that nobody replaced our inspector (effector/inspect has a single slot). */
  check(): boolean {
    if (!this.probe) return true;
    this.isProbeSeen = false;
    try {
      launch({ target: this.probe, params: null });
    } catch {
      /* ignore */
    }
    const isOurs = this.isProbeSeen;
    const { diagnostics, health, connection } = this.parts;
    if (isOurs === diagnostics.hasInspectorConflict) {
      diagnostics.hasInspectorConflict = !isOurs;
      health.refreshStaticDiagnostics();
      connection.scheduleFlush();
    }
    return isOurs;
  }

  /** While a panel is connected, check the slot every few seconds. */
  startWatching() {
    if (this.probeTimer || typeof setInterval === 'undefined') return;
    this.probeTimer = setInterval(() => {
      if (this.parts.connection.isListening) this.check();
    }, PROBE_INTERVAL_MS);
  }

  stopWatching() {
    if (!this.probeTimer) return;
    clearInterval(this.probeTimer);
    this.probeTimer = null;
  }

  /** Unit creation (and, with the upstream changes, scopes and disposal) reported by effector. */
  private readonly onGraphEvent: GraphInspectorFn = (node, regionStack, target) => {
    const { registry, scopes, health, connection } = this.parts;
    if (node === 'region' || node === 'link') return;
    if (node === 'scope') {
      // fork({ name }) with the upstream change: name scopes without an adapter
      const scope = target as Scope | undefined;
      if (scope && scope.name) scopes.nameIfDefault(scope, scope.name);
      return;
    }
    if (node === 'dispose') {
      const disposed = target as Node | undefined;
      if (disposed && registry.markDisposed(disposed.id)) connection.scheduleFlush();
      return;
    }
    try {
      if (!registry.declareUnit(node, regionStack)) return;
      connection.scheduleFlush();
      if (registry.hasAppStarted) health.scheduleStaticScan();
    } catch (error) {
      this.parts.onInternalError(error);
    }
  };
}
