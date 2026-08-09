import { encode, type Change, type Step, type Tx } from '@deffector/protocol';
import type { RawStep, RawTransaction } from '../history';
import type { Texts } from '../i18n';

/** step values are previews: the panel asks for full state separately */
const STEP_ENCODING = { maxDepth: 3, maxKeys: 12, maxItems: 12, maxString: 160 };
const FULL_ENCODING = { maxDepth: 6, maxKeys: 80, maxItems: 80, maxString: 2000 };

function noteText(note: string | undefined, texts: Texts): string | undefined {
  switch (note) {
    case 'same':
      return texts.noteSame;
    case 'undefined':
      return texts.noteUndefined;
    case 'filtered':
      return texts.noteFiltered;
    default:
      return note;
  }
}

function encodeStep(step: RawStep, texts: Texts): Step {
  return {
    i: step.index,
    node: step.node.id,
    op: step.op,
    lane: step.lane,
    parent: step.parentIndex,
    status: step.status || 'passed',
    value: step.isInternal ? undefined : encode(step.value, STEP_ENCODING),
    prev:
      step.hasPreviousValue && !step.isInternal
        ? encode(step.previousValue, STEP_ENCODING)
        : undefined,
    error: step.hasFailed ? encode(step.error, STEP_ENCODING) : undefined,
    internal: step.isInternal,
    note: noteText(step.note, texts),
    fxId: step.effectCallId,
  };
}

/** A synthetic transaction did not run: one root step carries its explanation. */
function syntheticSteps(transaction: RawTransaction, text: string): Step[] {
  return [
    {
      i: 0,
      node: transaction.root.id,
      op: String(transaction.root.meta.op),
      lane: 'pure',
      parent: null,
      status: 'root',
      internal: false,
      note: text,
    },
  ];
}

/** Stores that changed (a root store with children changed too, whatever its status). */
function changesOf(transaction: RawTransaction): Change[] {
  const changes: Change[] = [];
  for (const step of transaction.steps) {
    const isChangedRoot = step.index === 0 && step.isStore && step.childCount > 0;
    if ((step.status !== 'changed' && !isChangedRoot) || step.isInternal) continue;
    changes.push({
      node: step.node.id,
      from: encode(step.previousValue, FULL_ENCODING),
      to: encode(step.value, FULL_ENCODING),
    });
  }
  return changes;
}

/** The transaction as the panel gets it; cached until something in it changes. */
export function encodeTransaction(transaction: RawTransaction, texts: Texts): Tx {
  if (transaction.encoded) return transaction.encoded;
  const { synthetic, settle } = transaction;
  const encoded: Tx = {
    id: transaction.id,
    t: transaction.time,
    scopeId: transaction.scopeId,
    root: transaction.root.id,
    rootOp: String(transaction.root.meta.op),
    payload: synthetic ? undefined : encode(transaction.payload, FULL_ENCODING),
    steps: synthetic
      ? syntheticSteps(transaction, synthetic.text)
      : transaction.steps.map((step) => encodeStep(step, texts)),
    changes: changesOf(transaction),
    cause: transaction.cause,
    calls: transaction.effectCalls.map((call) => ({
      fxId: call.effectCallId,
      node: call.node.id,
      params: encode(call.params, FULL_ENCODING),
    })),
    settle: settle
      ? {
          fxId: settle.effectCallId,
          node: settle.node.id,
          status: settle.status,
          value: encode(settle.value, FULL_ENCODING),
          ms: settle.durationMs,
        }
      : undefined,
    flags: transaction.flags,
    note: transaction.note,
    duration: Math.round((transaction.endedAt - transaction.startedAt) * 100) / 100,
    replayOf: transaction.replayOf,
  };
  transaction.encoded = encoded;
  return encoded;
}
