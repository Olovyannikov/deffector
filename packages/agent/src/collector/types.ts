import type { TxCause, TxFlags } from '@deffector/protocol';
import type { Node } from '../effector';
import type { RawTransaction } from '../history';

export interface CollectorHooks {
  onClose(transactions: RawTransaction[]): void;
  onInternalError(error: unknown): void;
  onEmergencyStop?(): void;
}

/** Set right before deffector itself launches a unit: how to label the transaction it starts. */
export interface LaunchLabel {
  cause?: TxCause;
  note?: string;
  flags?: Partial<TxFlags>;
  /** several targets launched at once: their roots form one transaction */
  isGroup?: boolean;
  /** trace step the launch replays */
  replayOf?: number;
}

/** What the last emergency stop saw: the most frequent units of the runaway. */
export interface EmergencyStopReport {
  /** ms since the agent started */
  at: number;
  steps: number;
  hottestUnits: { id: string; count: number }[];
}

/** Where a recorded kernel step went: index -1 = past the step limit, not recorded. */
export interface StepLocation {
  transaction: RawTransaction;
  index: number;
}

/** An effect call (or its settle transaction) that later deferred launches belong to. */
export interface EffectRun {
  transaction: RawTransaction;
  node: Node;
  stepIndex: number;
}

export interface EffectCall extends EffectRun {
  calledAt: number;
}
