/** effector unit kinds plus operator node ops (`node.meta.op`). */
export type UnitKind =
  | 'store'
  | 'event'
  | 'effect'
  | 'domain'
  | 'on'
  | 'map'
  | 'filterMap'
  | 'filter'
  | 'sample'
  | 'combine'
  | 'split'
  | 'watch'
  | 'fx'
  | 'merge'
  | 'prepend'
  | 'reinit'
  | string;

export interface FactoryInfo {
  name?: string;
  sid?: string;
  method?: string;
  file?: string;
  line?: number;
}

export interface UnitInfo {
  /** effector graph node id, stable within one page load */
  id: string;
  kind: UnitKind;
  /** human readable name: unit name, or an operator label like `$email.on(emailChanged)` */
  name: string;
  sid: string | null;
  file?: string;
  line?: number;
  column?: number;
  /** combine/map stores, mapped events: can't be written to */
  derived: boolean;
  /** updates/reinit/finally/done/fail/inFlight/pending and similar helper units */
  internal: boolean;
  /** true for real units (store/event/effect/domain), false for operator nodes */
  isUnit: boolean;
  writable: boolean;
  serializeIgnore?: boolean;
  /** id of the unit this helper belongs to (`$email` for `$email.updates`) */
  ownerId?: string;
  factory?: FactoryInfo;
  /** full domain path: `auth/session` */
  domain?: string;
  /** model instance registered with registerModel / the @@debug protocol */
  model?: string;
  /** ms since the agent started when the unit was created (units created at import time have ~0) */
  createdAt?: number;
  /** for operators: units this node writes to */
  targets?: string[];
  /** removed with clearNode */
  disposed?: boolean;
}

export interface ScopeInfo {
  id: string;
  name: string;
  kind: 'scope' | 'global';
  /** the scope currently rendered by the app */
  view: boolean;
  /** the scope that represents the present (not a time-travel branch) */
  live: boolean;
  /** a scope created by deffector for time travel or replay */
  branch?: { fromScopeId: string; txId: number | null; reason: 'jump' | 'replay' | 'silent-edit' };
  /** a framework adapter can switch the app to another scope */
  switchable: boolean;
}

/** A node of the unit graph view. */
export interface GraphNode {
  id: string;
  kind: string;
  name: string;
  derived: boolean;
  internal: boolean;
  file?: string;
  factory?: string;
  domain?: string;
  model?: string;
}

/** `next`: the target runs after the source; `read`: the target reads the source store. */
export interface GraphEdge {
  from: string;
  to: string;
  kind: 'next' | 'read';
  via?: string;
}
