import {
  TRACE_FORMAT,
  type Encoded,
  type TraceFile,
  type TraceStep,
  type TxCause,
} from '@deffector/protocol';
import type { History, RawTransaction } from '../history';
import type { Registry, UnitRecord } from '../registry';
import { GLOBAL_ID, type Scopes } from '../scopes';
import { isExternalRoot } from './externalRoot';
import { TraceUnits } from './traceUnits';
import { TraceValues } from './traceValues';

export interface TraceExportContext {
  registry: Registry;
  scopes: Scopes;
  history: History;
  app: { name: string; url: string; build?: string };
  effectorVersion: string;
  agentVersion: string;
  readCurrentValue(scopeId: string, stateRefId: string): unknown;
}

/** What a devtools transaction replays as: an edit of values, or a plain call. */
function devtoolsKindOf(cause: TxCause | undefined): TraceStep['devtools'] {
  if (cause?.kind !== 'devtools') return undefined;
  switch (cause.action) {
    case 'preset':
    case 'revert':
      return cause.action;
    case 'dispatch':
    case 'replay':
      return undefined;
    default:
      return 'edit';
  }
}

/**
 * A trace of one scope: the initial state, the external calls and the effect
 * results recorded since the oldest retained transaction.
 */
export function exportTrace(context: TraceExportContext, scopeId: string | null): TraceFile {
  const { registry, history, scopes } = context;
  const exportedScopeId = scopeId ?? scopes.liveId ?? GLOBAL_ID;
  const scopeKind = exportedScopeId === GLOBAL_ID ? 'global' : 'scope';
  const units = new TraceUnits();
  const values = new TraceValues();

  // initial: state before the oldest retained transaction of this scope
  const storesByStateRef = new Map<string, UnitRecord>();
  for (const store of registry.writableStores()) storesByStateRef.set(store.stateRef!.id, store);
  const initial: Record<string, Encoded> = {};
  const base = history.valuesAt(exportedScopeId, -1, [...storesByStateRef.keys()], (stateRefId) =>
    context.readCurrentValue(exportedScopeId, stateRefId),
  );
  for (const [stateRefId, value] of base) {
    const store = storesByStateRef.get(stateRefId);
    if (!store || store.info.internal) continue;
    units.add(store);
    initial[store.info.id] = values.encode(value, store.info.name, store.info.name);
  }

  const transactions = history.inScope(exportedScopeId);
  const steps: TraceStep[] = [];
  const effectResults: TraceFile['effectResults'] = [];
  const notes: TraceFile['notes'] = [];
  const callCounts = new Map<string, number>();
  const firstStepTime = transactions.find(isExternalRoot)?.time ?? 0;

  const addEffectResult = (transaction: RawTransaction) => {
    const { settle } = transaction;
    const effect = settle && registry.get(settle.node.id);
    if (!settle || !effect) return;
    units.add(effect);
    const call = (callCounts.get(effect.info.id) || 0) + 1;
    callCounts.set(effect.info.id, call);
    effectResults.push({
      unit: effect.info.id,
      call,
      status: settle.status,
      value: values.encode(settle.value, effect.info.name, `${effect.info.name}#${call}`),
      ms: settle.durationMs,
    });
  };

  /** the values a devtools edit wrote: the root store steps of the transaction */
  const editedValues = (transaction: RawTransaction): Record<string, Encoded> => {
    const edited: Record<string, Encoded> = {};
    for (const step of transaction.steps) {
      if (step.parentIndex !== null || !step.isWritable || !step.isStore) continue;
      const store = registry.get(step.node.id);
      if (!store) continue;
      units.add(store);
      edited[store.info.id] = values.encode(step.value, store.info.name, store.info.name);
    }
    return edited;
  };

  const addStep = (transaction: RawTransaction) => {
    const root = registry.get(transaction.root.id);
    if (!root) return;
    units.add(root);
    const step: TraceStep = {
      n: transaction.id,
      t: transaction.time - firstStepTime,
      unit: root.info.id,
      scope: scopeKind,
      params: values.encode(transaction.payload, root.info.name, `${root.info.name}.params`),
    };
    const devtools = devtoolsKindOf(transaction.cause);
    if (devtools) {
      step.devtools = devtools;
      step.values = editedValues(transaction);
    }
    steps.push(step);
    if (transaction.note) notes.push({ step: transaction.id, text: transaction.note });
  };

  for (const transaction of transactions) {
    if (transaction.settle && !transaction.flags.skipped) addEffectResult(transaction);
    else if (isExternalRoot(transaction)) addStep(transaction);
  }

  return {
    format: TRACE_FORMAT,
    meta: {
      app: context.app.name,
      url: context.app.url,
      build: context.app.build,
      effector: context.effectorVersion,
      agent: context.agentVersion,
      recordedAt: new Date().toISOString(),
      scope: { name: scopes.nameOf(exportedScopeId), kind: scopeKind },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    },
    units: units.list(),
    initial,
    steps,
    effectResults,
    notes,
    redacted: values.redactedPaths(),
    lossy: values.lossyPaths(),
  };
}
