import type { Node } from '../effector';
import type { Registry } from '../registry';
import type { EmergencyStopReport } from './types';

/** distinct nodes counted during a runaway: enough to name the loop */
const MAX_COUNTED_NODES = 5000;

const HOTTEST_SHOWN = 8;

/**
 * The emergency stop. An infinite loop through events never leaves the kernel and
 * freezes the tab, so steps are counted per synchronous run (the counter resets on
 * a microtask). Past the limit, propagation is cut from every node that runs: the
 * kernel finishes the queued steps without pushing their children, the heap drains
 * and the tab survives. Edges come back on the next microtask.
 */
export class RunawayGuard {
  /**
   * Steps in one synchronous kernel run after which deffector cuts propagation
   * (an infinite loop through events would otherwise freeze the tab). false = off.
   */
  stepLimit: number | false = 100_000;

  lastStop: EmergencyStopReport | null = null;

  /** steps in the current synchronous burst (reset on a microtask) */
  private stepsInBurst = 0;

  private isBurstEndQueued = false;

  private readonly cutEdges = new Map<Node, Node[]>();

  private readonly stepsByNode = new Map<Node, number>();

  constructor(
    private readonly registry: Registry,
    private readonly clock: () => number,
    private readonly onStop: (report: EmergencyStopReport) => void,
  ) {}

  /**
   * Called for every kernel step, before anything is recorded. Returns true while
   * a runaway is being cut: the step must not be recorded.
   */
  countStep(node: Node): boolean {
    if (!this.isBurstEndQueued) {
      this.isBurstEndQueued = true;
      queueMicrotask(this.endBurst);
    }
    if (this.stepLimit === false) return false;
    this.stepsInBurst += 1;
    if (this.stepsInBurst <= this.stepLimit) return false;
    this.cut(node);
    return true;
  }

  private cut(node: Node) {
    if (this.stepsByNode.size < MAX_COUNTED_NODES) {
      this.stepsByNode.set(node, (this.stepsByNode.get(node) || 0) + 1);
    }
    if (this.cutEdges.has(node) || !node.next || !node.next.length) return;
    this.cutEdges.set(node, node.next);
    node.next = [];
  }

  private readonly endBurst = () => {
    this.isBurstEndQueued = false;
    this.stepsInBurst = 0;
    if (!this.cutEdges.size) return;
    // the runaway is over: give the graph its edges back
    for (const [node, next] of this.cutEdges) node.next = next;
    this.cutEdges.clear();
    this.lastStop = {
      at: this.clock(),
      steps: this.stepLimit as number,
      hottestUnits: this.hottestUnits(),
    };
    this.stepsByNode.clear();
    this.onStop(this.lastStop);
  };

  /** Operators were not registered while the stop was cutting: name them by the unit they belong to. */
  private hottestUnits(): { id: string; count: number }[] {
    const hottest = [...this.stepsByNode]
      .sort((a, b) => b[1] - a[1])
      .slice(0, HOTTEST_SHOWN)
      .map(([node, count]) => {
        const record = this.registry.ensureRecord(node);
        const ownerId = record && !record.info.isUnit ? record.info.ownerId : undefined;
        return { id: ownerId || node.id, count };
      });
    return hottest.filter(
      (unit, index) =>
        this.registry.get(unit.id) && hottest.findIndex((other) => other.id === unit.id) === index,
    );
  }
}
