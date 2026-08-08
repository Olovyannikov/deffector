import type { Diagnostic } from '@deffector/protocol';

/** A diagnostic before it is counted: the store assigns `id` and `count`. */
export type Finding = Omit<Diagnostic, 'id' | 'count'>;

export interface FindingCounter {
  /** Count one more occurrence; `describe` runs only for the first one. */
  count(key: string, describe: () => Finding, transactionId?: number): void;
}

/** A cycle in the static unit graph; `isEventsOnly` = no store on it to stop the loop. */
export interface GraphCycle {
  ids: string[];
  isEventsOnly: boolean;
}
