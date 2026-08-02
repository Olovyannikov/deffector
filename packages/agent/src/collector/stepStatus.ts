import type { StepStatus } from '@deffector/protocol';
import type { History, RawStep, RawTransaction } from '../history';
import { isFilterOperator } from '../registry';

/** The kernel says so (upstream PR 2); otherwise: a node with children that pushed none. */
function hasStoppedBranch(step: RawStep): boolean {
  if (step.kernelSkipped !== undefined) return step.kernelSkipped;
  return step.node.next.length > 0 && step.childCount === 0;
}

function statusOf(step: RawStep, transaction: RawTransaction, isChanged: boolean): StepStatus {
  if (step.hasFailed) return 'error';
  if (step.index === 0) {
    if (transaction.settle) return transaction.settle.status;
    return isChanged ? 'changed' : 'root';
  }
  if (step.isStore) return isChanged ? 'changed' : 'same';
  if (step.effectCallId) return 'call';
  // a runaway cut by the emergency stop has no children anywhere: nothing was filtered
  if (!transaction.flags.stopped && isFilterOperator(step.op) && hasStoppedBranch(step)) {
    return 'filtered';
  }
  return 'passed';
}

/**
 * Statuses are known only once the transaction is over: a store changed if it
 * pushed children. Changed writable stores become the transaction's deltas.
 * Returns how many times each user unit changed.
 */
export function settleStepStatuses(
  transaction: RawTransaction,
  history: History,
): Map<string, number> {
  const changeCounts = new Map<string, number>();
  for (const step of transaction.steps) {
    const isChanged = step.isStore && !step.hasFailed && step.childCount > 0;
    step.status = statusOf(step, transaction, isChanged);
    if (step.status === 'same') step.note = step.value === undefined ? 'undefined' : 'same';
    if (step.status === 'filtered') step.note = 'filtered';
    if (!isChanged) continue;
    if (!step.isInternal) {
      changeCounts.set(step.node.id, (changeCounts.get(step.node.id) || 0) + 1);
    }
    if (step.isWritable && step.stateRefId) {
      if (!transaction.previousValues.has(step.stateRefId)) {
        transaction.previousValues.set(step.stateRefId, step.previousValue);
      }
      transaction.deltas.set(step.stateRefId, step.value);
      history.rememberInitialValue(transaction.scopeId, step.stateRefId, step.previousValue);
    }
  }
  return changeCounts;
}
