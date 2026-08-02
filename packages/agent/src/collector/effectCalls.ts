import type { Stack } from '../effector';
import type { EffectSettle, RawTransaction } from '../history';
import { now } from '../platform';
import type { Registry, UnitRecord } from '../registry';
import type { EffectCall, EffectRun } from './types';

/** effect calls remembered for linking their results; the oldest is forgotten first */
const MAX_EFFECT_CALLS = 5000;

/** What effector passes to an effect's `finally`. */
interface FinallyPayload {
  status?: string;
  result?: unknown;
  error?: unknown;
}

/** How an effect call ended, read from the payload of its `finally`. */
function readSettle(
  finallyStack: Stack,
  effectCallId: string,
  call: EffectCall | undefined,
  settledAt: number,
): EffectSettle {
  const payload = finallyStack.value as FinallyPayload | null | undefined;
  const status = payload && payload.status === 'fail' ? 'fail' : 'done';
  let value: unknown;
  if (payload) value = status === 'done' ? payload.result : payload.error;
  return {
    effectCallId,
    node: call ? call.node : finallyStack.node,
    status,
    value,
    durationMs: call ? Math.round(settledAt - call.calledAt) : null,
  };
}

/**
 * Effect calls and their results are separate launches in effector; they are
 * linked by `stack.meta.fxID`, the id of one call.
 */
export class EffectCallTracker {
  private readonly calls = new Map<string, EffectCall>();

  /** open settle transactions by fxID: the effect's sidechain node is launched in the same batch */
  private readonly openSettles = new Map<string, RawTransaction>();

  constructor(private readonly registry: Registry) {}

  /** An effect step starts a call. Returns its id. */
  recordCall(transaction: RawTransaction, stack: Stack, stepIndex: number): string {
    const effectCallId = String(stack.meta!.fxID);
    const { node } = stack;
    transaction.effectCalls.push({ effectCallId, node, params: stack.value });
    this.calls.set(effectCallId, { transaction, node, calledAt: now(), stepIndex });
    if (this.calls.size > MAX_EFFECT_CALLS) {
      this.calls.delete(this.calls.keys().next().value as string);
    }
    return effectCallId;
  }

  /**
   * An effect's runner is launched deferred, without a stack, yet it is part of the
   * call; so is its sidechain, which resolves the promise returned by the call and
   * is launched together with `finally`. Called for root steps only.
   */
  findRun(stack: Stack, record: UnitRecord): EffectRun | undefined {
    if (stack.node.meta.op !== 'fx' || !stack.meta || stack.meta.fxID == null) return undefined;
    const effectCallId = String(stack.meta.fxID);
    const call = this.calls.get(effectCallId);
    if (call && call.transaction.isOpen) return call;
    const settleTransaction = this.openSettles.get(effectCallId);
    if (!settleTransaction || !settleTransaction.isOpen || !settleTransaction.settle) {
      return undefined;
    }
    const effectNode = settleTransaction.settle.node;
    if (!record.info.internal) {
      const effectName = this.registry.get(effectNode.id)?.info.name ?? 'effect';
      this.registry.markAsHelper(stack.node.id, `${effectName}.resolve`);
    }
    return { transaction: settleTransaction, stepIndex: 0, node: effectNode };
  }

  /** `finally` of an effect starts the transaction of its result. */
  recordSettle(transaction: RawTransaction, stack: Stack, effectCallId: string, settledAt: number) {
    const call = this.calls.get(effectCallId);
    transaction.cause = {
      kind: 'effect',
      fxId: effectCallId,
      txId: call ? call.transaction.id : null,
      node: call ? call.node.id : '',
    };
    transaction.settle = readSettle(stack, effectCallId, call, settledAt);
    if (call) this.calls.delete(effectCallId);
    this.openSettles.set(effectCallId, transaction);
  }

  /** the batch is over: its settle transactions are closed */
  forgetOpenSettles() {
    this.openSettles.clear();
  }
}
