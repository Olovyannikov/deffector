import type { InspectorFn, Local, Stack } from '../effector';
import type { History, RawStep, RawTransaction } from '../history';
import { now } from '../platform';
import type { Registry } from '../registry';
import type { Scopes } from '../scopes';
import { TransactionFinalizer } from './finalize';
import { RunawayGuard } from './runawayGuard';
import { createSyntheticTransaction, type SyntheticUnit } from './syntheticTransaction';
import { EffectCallTracker } from './effectCalls';
import type { CollectorHooks, EffectRun, LaunchLabel, StepLocation } from './types';

function parentIndexOf(
  transaction: RawTransaction,
  parentStep: StepLocation | undefined,
  effectRun: EffectRun | undefined,
): number | null {
  if (effectRun) return effectRun.stepIndex;
  if (parentStep && parentStep.transaction === transaction && parentStep.index >= 0) {
    return parentStep.index;
  }
  return null;
}

/**
 * Turns the stream of kernel steps into transactions.
 *
 * A transaction is everything a root launch caused synchronously. Parent links
 * come from the real `Stack.parent`. Two heuristics fill the gaps effector
 * doesn't report (proposed upstream as effector PR 4):
 *  - effect results are separate launches; they are linked by `stack.meta.fxID`;
 *  - a launch from inside a watcher/handler is a new root; it is "nested" if
 *    the outer transaction receives more steps after it started.
 *
 * `inspector` runs for every kernel step of the app: the code on its path must
 * stay cheap and must not allocate beyond the recorded step itself.
 */
export class Collector {
  private readonly stepLocations = new WeakMap<Stack, StepLocation>();

  private openTransactions: RawTransaction[] = [];

  /** the transaction that received the latest step */
  private activeTransaction: RawTransaction | null = null;

  private nextTransactionId = 1;

  private isCloseQueued = false;

  readonly startedAt = now();

  /** launches deffector makes itself (time travel in place) are not recorded while > 0 */
  private unrecordedDepth = 0;

  isRecording = true;

  /** no panel attached: only the emergency stop runs */
  isPaused = false;

  maxSteps = 5000;

  /** transactions whose label matches one of these are kept for state but not shown */
  ignorePatterns: RegExp[] = [];

  /** set by the agent right before it launches a unit */
  private launchLabel: LaunchLabel | null = null;

  /** the transaction a labeled group launch started: its other roots join it */
  private groupTransaction: RawTransaction | null = null;

  readonly runawayGuard: RunawayGuard;

  private readonly finalizer: TransactionFinalizer;

  private readonly effectCalls: EffectCallTracker;

  constructor(
    private readonly registry: Registry,
    private readonly scopes: Scopes,
    history: History,
    private readonly hooks: CollectorHooks,
  ) {
    this.runawayGuard = new RunawayGuard(registry, () => this.elapsed(), this.onRunawayStopped);
    this.finalizer = new TransactionFinalizer(registry, scopes, history);
    this.effectCalls = new EffectCallTracker(registry);
  }

  /** The kernel inspector. Must never throw: a throw here breaks the effector kernel. */
  readonly inspector: InspectorFn = (stack, local, kernelSkipped) => {
    if (this.runawayGuard.countStep(stack.node)) return;
    if (this.unrecordedDepth > 0 || this.isPaused) return;
    try {
      this.onStep(stack, local, kernelSkipped);
    } catch (error) {
      this.hooks.onInternalError(error);
    }
  };

  private takeTransactionId(): number {
    const id = this.nextTransactionId;
    this.nextTransactionId += 1;
    return id;
  }

  /** ms since the agent started */
  elapsed(): number {
    return Math.round(now() - this.startedAt);
  }

  /** Run a launch deffector makes itself without recording it. */
  runUnrecorded(launchUnits: () => void) {
    this.unrecordedDepth += 1;
    try {
      launchUnits();
    } finally {
      this.unrecordedDepth -= 1;
    }
  }

  /** Run a launch deffector makes itself; the transaction it starts carries the label. */
  runLabeled(label: LaunchLabel, launchUnits: () => void) {
    this.launchLabel = label;
    try {
      launchUnits();
    } finally {
      this.launchLabel = null;
      this.groupTransaction = null;
    }
  }

  private onStep(stack: Stack, local: Local, kernelSkipped: boolean | undefined) {
    const { node } = stack;
    const record = this.registry.ensureRecord(node);
    if (!record) return;
    const parentStep = stack.parent ? this.stepLocations.get(stack.parent) : undefined;
    const effectRun = stack.parent ? undefined : this.effectCalls.findRun(stack, record);
    const transaction = this.transactionOf(stack, parentStep, effectRun);
    if (effectRun && record.info.name.startsWith('?')) {
      const effectName = this.registry.get(effectRun.node.id)?.info.name;
      this.registry.rename(node.id, `${effectName} handler`);
    }
    if (transaction.steps.length >= this.maxSteps) {
      transaction.flags.truncated = true;
      this.stepLocations.set(stack, { transaction, index: -1 });
      return;
    }
    const op: string = node.meta.op;
    const isStore = op === 'store';
    const index = transaction.steps.length;
    const parentIndex = parentIndexOf(transaction, parentStep, effectRun);
    const step: RawStep = {
      index,
      node,
      op,
      lane: index === 0 ? 'pure' : this.registry.laneOf(node),
      parentIndex,
      value: stack.value,
      previousValue: isStore ? stack.a : undefined,
      hasPreviousValue: isStore,
      hasFailed: !!local.fail,
      error: local.fail ? local.failReason : undefined,
      childCount: 0,
      isInternal: record.info.internal,
      isStore,
      isWritable: record.info.writable,
      stateRefId: record.stateRef?.id,
      kernelSkipped,
    };
    if (parentIndex !== null) transaction.steps[parentIndex].childCount += 1;
    if (op === 'effect' && stack.meta && stack.meta.fxID != null) {
      step.effectCallId = this.effectCalls.recordCall(transaction, stack, index);
    }
    transaction.steps.push(step);
    transaction.endedAt = now();
    this.stepLocations.set(stack, { transaction, index });
    this.resolveNesting(transaction, op, index);
    this.activeTransaction = transaction;
  }

  private transactionOf(
    stack: Stack,
    parentStep: StepLocation | undefined,
    effectRun: EffectRun | undefined,
  ): RawTransaction {
    if (effectRun) return effectRun.transaction;
    if (parentStep && parentStep.transaction.isOpen) return parentStep.transaction;
    const { groupTransaction } = this;
    if (!stack.parent && this.launchLabel?.isGroup && groupTransaction?.isOpen) {
      return groupTransaction;
    }
    return this.startTransaction(stack);
  }

  /**
   * A root that started while another transaction was running is nested in it
   * if that one receives more steps afterwards. The watcher/handler that made
   * the call reports after the call finished: that step is the cause.
   */
  private resolveNesting(transaction: RawTransaction, op: string, index: number) {
    if (this.activeTransaction !== transaction) {
      for (const candidate of this.openTransactions) {
        if (candidate.nestingCandidate !== transaction || candidate.cause) continue;
        candidate.cause = { kind: 'nested', txId: transaction.id, step: null };
        candidate.nestingCandidate = undefined;
      }
    }
    if (op !== 'watch' && op !== 'fx') return;
    for (const nested of this.openTransactions) {
      const { cause } = nested;
      if (nested === transaction || cause?.kind !== 'nested') continue;
      if (cause.txId === transaction.id && cause.step === null) cause.step = index;
    }
  }

  private startTransaction(stack: Stack): RawTransaction {
    const startedAt = now();
    const scopeId = this.scopes.idOf(stack.scope);
    const transaction: RawTransaction = {
      id: this.takeTransactionId(),
      time: Math.round(startedAt - this.startedAt),
      startedAt,
      endedAt: startedAt,
      scopeId,
      root: stack.node,
      steps: [],
      isOpen: true,
      effectCalls: [],
      flags: {},
      deltas: new Map(),
      previousValues: new Map(),
      payload: stack.value,
    };
    const label = this.launchLabel;
    if (label && !stack.parent) this.applyLaunchLabel(transaction, label);
    else this.findCauseOf(transaction, stack, startedAt);
    if (this.scopes.isBranch(scopeId)) transaction.flags.branch = true;
    this.registry.hasAppStarted = true;
    this.openTransactions.push(transaction);
    if (!this.isCloseQueued) {
      this.isCloseQueued = true;
      queueMicrotask(this.closeQueued);
    }
    return transaction;
  }

  private applyLaunchLabel(transaction: RawTransaction, label: LaunchLabel) {
    if (label.cause) transaction.cause = label.cause;
    if (label.note) transaction.note = label.note;
    if (label.flags) Object.assign(transaction.flags, label.flags);
    if (label.replayOf !== undefined) transaction.replayOf = label.replayOf;
    // one launch from the panel = one transaction; nested roots it causes are found as usual
    if (label.isGroup) this.groupTransaction = transaction;
    else this.launchLabel = null;
  }

  private findCauseOf(transaction: RawTransaction, stack: Stack, startedAt: number) {
    const effectCallId = stack.meta?.fxID;
    if (effectCallId != null && stack.node.meta.named === 'finally') {
      this.effectCalls.recordSettle(transaction, stack, String(effectCallId), startedAt);
      return;
    }
    const caller = stack.caller && this.stepLocations.get(stack.caller);
    if (caller) {
      // effector with the upstream PR 4 tells exactly who launched this
      const step = caller.index >= 0 ? caller.index : null;
      transaction.cause = { kind: 'nested', txId: caller.transaction.id, step };
      return;
    }
    if (this.activeTransaction?.isOpen) transaction.nestingCandidate = this.activeTransaction;
  }

  private readonly closeQueued = () => this.closeAll();

  /** Close transactions that are still open (normally done on a microtask). */
  closeAll() {
    this.isCloseQueued = false;
    if (!this.openTransactions.length) return;
    const closing = this.openTransactions;
    this.openTransactions = [];
    this.activeTransaction = null;
    this.effectCalls.forgetOpenSettles();
    for (const transaction of closing) this.finalizer.finalize(transaction, this.ignorePatterns);
    try {
      this.hooks.onClose(closing);
    } catch (error) {
      this.hooks.onInternalError(error);
    }
  }

  private readonly onRunawayStopped = () => {
    for (const transaction of this.openTransactions) transaction.flags.stopped = true;
    this.hooks.onEmergencyStop?.();
  };

  /** A transaction that didn't run (skipped replay step, unknown unit, silent edit). */
  createSynthetic(
    scopeId: string,
    unit: SyntheticUnit,
    text: string,
    extra: Partial<RawTransaction> = {},
  ): RawTransaction {
    const time = now();
    return createSyntheticTransaction({
      id: this.takeTransactionId(),
      time: Math.round(time - this.startedAt),
      startedAt: time,
      scopeId,
      unit,
      text,
      extra,
    });
  }
}
