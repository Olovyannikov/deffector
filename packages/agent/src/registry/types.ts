import type { UnitInfo } from '@deffector/protocol';
import type { Node, StateRef } from '../effector';

export interface UnitRecord {
  info: UnitInfo;
  node: Node;
  stateRef?: StateRef;
  /** fillLocations already looked for a source location */
  isLocationLookedUp?: boolean;
}

/** Units created at one source location (sid, or file:line:column). */
export interface CreationCount {
  count: number;
  /** the first few units created there */
  unitIds: string[];
  /** how many were created after the app started */
  lateCount: number;
}
