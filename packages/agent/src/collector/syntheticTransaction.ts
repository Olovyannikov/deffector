import type { Node } from '../effector';
import type { RawTransaction } from '../history';

export interface SyntheticUnit {
  id: string;
  op: string;
  name: string;
}

interface SyntheticTransactionParts {
  id: number;
  time: number;
  startedAt: number;
  scopeId: string;
  unit: SyntheticUnit;
  text: string;
  extra: Partial<RawTransaction>;
}

/** A node-shaped stand-in for a unit that did not run (or does not exist on this page). */
function placeholderNode(unit: SyntheticUnit): Node {
  return {
    id: unit.id,
    next: [],
    seq: [],
    scope: null,
    meta: { op: unit.op, name: unit.name },
    family: { type: 'regular', links: [], owners: [] },
  };
}

/** A transaction that didn't run: a skipped replay step, an unknown unit, a silent edit. */
export function createSyntheticTransaction({
  id,
  time,
  startedAt,
  scopeId,
  unit,
  text,
  extra,
}: SyntheticTransactionParts): RawTransaction {
  return {
    id,
    time,
    startedAt,
    endedAt: startedAt,
    scopeId,
    root: placeholderNode(unit),
    steps: [],
    isOpen: false,
    effectCalls: [],
    flags: { skipped: true },
    deltas: new Map(),
    previousValues: new Map(),
    payload: undefined,
    synthetic: { unitId: unit.id, op: unit.op, text },
    ...extra,
  };
}
