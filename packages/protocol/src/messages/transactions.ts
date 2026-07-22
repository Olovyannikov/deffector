import type { Encoded } from '../encoding';

/** Kernel priority lane a step ran in (effector kernel.ts buckets). */
export type Lane = 'child' | 'pure' | 'read' | 'barrier' | 'sampler' | 'effect';

export type StepStatus =
  | 'root' // the node that started the transaction
  | 'changed' // store accepted a new value
  | 'same' // store skipped: value === previous (or undefined)
  | 'filtered' // operator stopped the branch (sample filter, filterMap, guard)
  | 'passed' // node ran and propagated
  | 'error' // exception in a pure function
  | 'call' // effect called
  | 'done' // effect finished
  | 'fail'; // effect failed

export interface Step {
  /** index within the transaction */
  i: number;
  /** node id, see UnitInfo */
  node: string;
  op: string;
  lane: Lane;
  /** index of the step that pushed this one, null for the root */
  parent: number | null;
  status: StepStatus;
  value?: Encoded;
  /** previous store value for store steps */
  prev?: Encoded;
  error?: Encoded;
  internal: boolean;
  note?: string;
  fxId?: string;
}

export interface Change {
  node: string;
  from: Encoded;
  to: Encoded;
}

export type TxCause =
  | { kind: 'effect'; fxId: string; txId: number | null; node: string }
  | { kind: 'nested'; txId: number; step: number | null }
  | {
      kind: 'devtools';
      action: 'edit' | 'dispatch' | 'jump' | 'replay' | 'revert' | 'preset';
      label?: string;
    };

export interface TxFlags {
  /** started outside of any scope while the app uses fork() */
  outOfScope?: boolean;
  /** node ids of stores updated more than once in this transaction */
  double?: string[];
  /** sample/filter that stopped the branch, with reason */
  blocked?: { node: string; reason: string }[];
  error?: boolean;
  /** happened in a time-travel branch scope */
  branch?: boolean;
  replay?: boolean;
  skipped?: boolean;
  /** steps were not recorded past the limit (a runaway transaction) */
  truncated?: boolean;
  /** deffector cut the propagation to save the tab from an infinite synchronous loop */
  stopped?: boolean;
  /** matched an ignore rule: kept for state, not sent to the panel */
  hidden?: boolean;
  /** a sample read a store that was updated later in the same transaction: it used the old value */
  staleReads?: { reader: string; store: string }[];
  /** a derived store was written by sample/on instead of being computed from its sources */
  derivedWrite?: string[];
  /** units that would have run after a failed step but did not */
  skippedChildren?: string[];
}

export interface Tx {
  id: number;
  /** ms since agent start */
  t: number;
  scopeId: string;
  root: string;
  rootOp: string;
  payload?: Encoded;
  steps: Step[];
  changes: Change[];
  cause?: TxCause;
  /** effects started in this transaction */
  calls: { fxId: string; node: string; params: Encoded }[];
  /** set when this transaction is an effect settling */
  settle?: {
    fxId: string;
    node: string;
    status: 'done' | 'fail';
    value: Encoded;
    ms: number | null;
  };
  flags: TxFlags;
  note?: string;
  /** wall time spent in the kernel for this transaction, ms */
  duration: number;
  /** step number (TraceStep.n) of the trace this transaction replays */
  replayOf?: number;
}

/** Transactions whose label matches are hidden from the panel (see TxFlags.hidden). */
export interface IgnoreRule {
  /** regex over the transaction label */
  pattern: string;
}
