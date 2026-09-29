import type { Encoded } from '@deffector/protocol';
import { createVersionedSelector, type PanelStore } from '../../store';

export interface EffectCall {
  /** the agent's id of the call (`fxId`) */
  callId: string;
  node: string;
  params: Encoded;
  startedAt: number;
  endedAt: number | null;
  status: 'pending' | 'done' | 'fail';
  value?: Encoded;
  /** transaction that called the effect */
  callTransactionId: number;
  /** transaction in which the call settled */
  settleTransactionId?: number;
  /** an older call of the same effect finished after a newer one: its result may overwrite the newer one */
  finishedOutOfOrder: boolean;
}

function markOutOfOrder(calls: readonly EffectCall[]) {
  const callsByEffect = new Map<string, EffectCall[]>();
  for (const call of calls) {
    const sameEffect = callsByEffect.get(call.node) ?? [];
    sameEffect.push(call);
    callsByEffect.set(call.node, sameEffect);
  }
  for (const sameEffect of callsByEffect.values()) {
    for (let older = 0; older < sameEffect.length; older++) {
      for (let newer = older + 1; newer < sameEffect.length; newer++) {
        const olderEnd = sameEffect[older].endedAt;
        const newerEnd = sameEffect[newer].endedAt;
        if (olderEnd !== null && newerEnd !== null && olderEnd > newerEnd)
          sameEffect[older].finishedOutOfOrder = true;
      }
    }
  }
}

/** Every effect call in the log, in call order, with its outcome once it settled. */
export const selectEffectCalls = createVersionedSelector((store: PanelStore): EffectCall[] => {
  const calls: EffectCall[] = [];
  const byId = new Map<string, EffectCall>();
  for (const transaction of store.txs) {
    for (const started of transaction.calls) {
      const call: EffectCall = {
        callId: started.fxId,
        node: started.node,
        params: started.params,
        startedAt: transaction.t,
        endedAt: null,
        status: 'pending',
        callTransactionId: transaction.id,
        finishedOutOfOrder: false,
      };
      calls.push(call);
      byId.set(started.fxId, call);
    }
    const { settle } = transaction;
    const settled = settle && byId.get(settle.fxId);
    if (settle && settled) {
      settled.endedAt = transaction.t;
      settled.status = settle.status;
      settled.value = settle.value;
      settled.settleTransactionId = transaction.id;
    }
  }
  markOutOfOrder(calls);
  return calls;
});

/** Effects the user can override: real effect units, not the helpers effector creates for them. */
export const selectOverridableEffects = createVersionedSelector((store: PanelStore) =>
  [...store.units.values()]
    .filter((unit) => unit.isUnit && unit.kind === 'effect' && !unit.internal)
    .sort((left, right) => left.name.localeCompare(right.name)),
);
