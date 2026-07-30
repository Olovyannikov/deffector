import type { FactoryInfo, Lane, UnitInfo } from '@deffector/protocol';
import type { Node, RegionStack } from '../effector';
import { createOperatorRecord } from './operatorRecord';
import { readFactory } from './sourceLocation';
import type { CreationCount, UnitRecord } from './types';
import { createUnitRecord } from './unitRecord';

const UNIT_OPS = new Set(['store', 'event', 'effect', 'domain']);
const FILTER_OPS = new Set(['sample', 'filter', 'filterMap', 'split', 'guard']);

/** creations kept per location: enough to point at the leak */
const TRACKED_CREATIONS = 50;

/** Operators that may stop a branch (a filter returned false). */
export function isFilterOperator(op: string): boolean {
  return FILTER_OPS.has(op);
}

/**
 * Everything deffector knows about the graph: units (store, event, effect,
 * domain) declared through the graph inspector, and operator nodes met in steps.
 */
export class Registry {
  readonly units = new Map<string, UnitRecord>();

  /** nodes seen in steps that are not units (operators) */
  readonly operators = new Map<string, UnitRecord>();

  private readonly laneCache = new WeakMap<Node, Lane>();

  /** units/operators not yet sent to the panel */
  private unsent: UnitInfo[] = [];

  /** creations per source location (sid, or file:line:column): repeated runtime creation is a leak */
  readonly creationsByLocation = new Map<string, CreationCount>();

  /** the first transaction was seen: units created from now on are created "late" */
  hasAppStarted = false;

  /** StateRef id → store unit */
  readonly unitsByStateRef = new Map<string, UnitRecord>();

  /** @param clock ms since the agent started, for UnitInfo.createdAt */
  constructor(private readonly clock: () => number) {}

  /** Called from the graph inspector at unit creation time. */
  declareUnit(node: Node, regionStack: RegionStack | null): UnitRecord | undefined {
    const op = node.meta && node.meta.op;
    if (!UNIT_OPS.has(op)) return undefined;
    const existing = this.units.get(node.id);
    if (existing) return existing;
    const record = this.addUnit(node, readFactory(regionStack));
    record.info.createdAt = Math.round(this.clock());
    this.countCreation(record.info);
    return record;
  }

  private countCreation(info: UnitInfo) {
    if (info.internal || info.kind === 'domain') return;
    const location =
      info.sid || (info.file ? `${info.file}:${info.line}:${info.column ?? ''}` : '');
    if (!location) return;
    const creations = this.creationsByLocation.get(location) || {
      count: 0,
      unitIds: [],
      lateCount: 0,
    };
    creations.count += 1;
    if (creations.unitIds.length < TRACKED_CREATIONS) creations.unitIds.push(info.id);
    if (this.hasAppStarted) creations.lateCount += 1;
    this.creationsByLocation.set(location, creations);
  }

  /** clearNode removed the unit (reported by effector with the upstream PR 5) */
  markDisposed(id: string): boolean {
    const record = this.units.get(id);
    if (!record || record.info.disposed) return false;
    record.info.disposed = true;
    record.node.meta.__deffectorDisposed = true;
    this.markUnsent(record.info);
    return true;
  }

  /** Group units of a model instance (registerModel / @@debug) under one name. */
  assignModel(ids: string[], model: string) {
    for (const id of ids) {
      const record = this.units.get(id);
      if (!record) continue;
      record.info.model = model;
      this.markUnsent(record.info);
      // the helpers of a unit (updates, done, pending…) follow it
      for (const helper of this.units.values()) {
        if (helper.info.ownerId !== id || helper.info.model === model) continue;
        helper.info.model = model;
        this.markUnsent(helper.info);
      }
    }
  }

  /** Called for any node seen at runtime. Returns undefined for kernel service nodes. */
  ensureRecord(node: Node): UnitRecord | undefined {
    const known = this.units.get(node.id) || this.operators.get(node.id);
    if (known) return known;
    const op = node.meta && node.meta.op;
    if (!op) return undefined;
    if (UNIT_OPS.has(op)) return this.addUnit(node, undefined);
    return this.addOperator(node);
  }

  get(id: string): UnitRecord | undefined {
    return this.units.get(id) || this.operators.get(id);
  }

  allInfos(): UnitInfo[] {
    return [...this.units.values(), ...this.operators.values()].map((record) => record.info);
  }

  /** Stores that hold their own value (not derived) and still exist. */
  writableStores(): UnitRecord[] {
    const stores: UnitRecord[] = [];
    for (const record of this.units.values()) {
      if (record.info.writable && record.stateRef && !record.node.meta.__deffectorDisposed) {
        stores.push(record);
      }
    }
    return stores;
  }

  /** Show a node as a helper of a unit, under the given name (an effect's promise resolver). */
  markAsHelper(id: string, name: string) {
    const record = this.get(id);
    if (!record) return;
    record.info.internal = true;
    this.rename(id, name);
  }

  rename(id: string, name: string) {
    const record = this.get(id);
    if (!record || record.info.name === name) return;
    record.info.name = name;
    this.markUnsent(record.info);
  }

  takeUnsent(): UnitInfo[] {
    const { unsent } = this;
    this.unsent = [];
    return unsent;
  }

  private markUnsent(info: UnitInfo) {
    if (!this.unsent.includes(info)) this.unsent.push(info);
  }

  /** The kernel priority lane a node runs in. Called for every step: cached per node. */
  laneOf(node: Node): Lane {
    const cached = this.laneCache.get(node);
    if (cached) return cached;
    let lane: Lane = 'child';
    for (const step of node.seq || []) {
      if (step.order && step.order.priority) lane = step.order.priority as Lane;
    }
    this.laneCache.set(node, lane);
    return lane;
  }

  /**
   * A derived store without its own location lives where its source does
   * ($a.map(...)). The link to the source is created after the store itself,
   * so this runs later (before sending units and building the graph).
   */
  fillLocations(records: Iterable<UnitRecord> = this.units.values()) {
    for (const record of records) {
      const { info } = record;
      if (info.file || !info.derived || record.isLocationLookedUp) continue;
      record.isLocationLookedUp = true;
      const source = this.sourceUnitOf(record.node);
      if (!source) continue;
      info.file = source.info.file;
      info.line = source.info.line;
      if (!info.factory && source.info.factory) info.factory = source.info.factory;
      if (!info.model && source.info.model) info.model = source.info.model;
    }
  }

  /** The unit a derived store is computed from: owners are link nodes (map/combine) owned by the sources. */
  private sourceUnitOf(node: Node): UnitRecord | undefined {
    const isLocatedUserUnit = (record: UnitRecord | undefined): record is UnitRecord =>
      !!record && !record.info.internal && !!record.info.file;
    for (const owner of node.family?.owners || []) {
      const ownerRecord = this.units.get(owner.id);
      if (isLocatedUserUnit(ownerRecord)) return ownerRecord;
      for (const ownerOfOwner of owner.family?.owners || []) {
        if (ownerOfOwner === node) continue;
        const source = this.units.get(ownerOfOwner.id);
        if (isLocatedUserUnit(source)) return source;
      }
    }
    return undefined;
  }

  /** The unit a helper belongs to: a user unit among the owners, else any known owner. */
  private ownerUnitOf(node: Node): UnitRecord | undefined {
    const owners = node.family?.owners || [];
    for (const owner of owners) {
      const record = this.units.get(owner.id);
      if (record && !record.info.internal) return record;
    }
    for (const owner of owners) {
      const record = this.units.get(owner.id);
      if (record) return record;
    }
    return undefined;
  }

  private addUnit(node: Node, factory: FactoryInfo | undefined): UnitRecord {
    const record = createUnitRecord(node, factory, (helper) => this.ownerUnitOf(helper));
    const { stateRef } = record;
    // a helper store sharing a ref (`$store.updates`…) must not hide the store itself
    if (stateRef && (!record.info.internal || !this.unitsByStateRef.has(stateRef.id))) {
      this.unitsByStateRef.set(stateRef.id, record);
    }
    this.units.set(node.id, record);
    this.unsent.push(record.info);
    return record;
  }

  private addOperator(node: Node): UnitRecord {
    const record = createOperatorRecord(node, this.units);
    this.operators.set(node.id, record);
    this.unsent.push(record.info);
    return record;
  }
}
