import type { FactoryInfo, UnitInfo } from '@deffector/protocol';
import { INTERNAL_NAMED, type Node } from '../effector';
import { anonymousName, shortName } from './naming';
import { domainOf, readLocation } from './sourceLocation';
import type { UnitRecord } from './types';

/** effector names an unnamed unit by its numeric id */
function hasOwnName(name: unknown): boolean {
  return !!name && !/^\d+$/.test(String(name));
}

/**
 * The kind of a helper unit effector creates for every store/effect (`updates`,
 * `inFlight`, `done`…), or null for a user unit. Effects name their counters
 * `${name}.inFlight`: the tail tells what it is.
 */
function helperKindOf(meta: Record<string, any>): string | null {
  if (!meta.named) return null;
  const tail = String(meta.named).split('.').pop()!;
  return INTERNAL_NAMED.has(tail) ? tail : null;
}

/** units from a factory get the instance name: `password.changed`, `email.$value` */
function nameInFactory(name: string, factory: FactoryInfo | undefined): string {
  if (!factory?.name || name.startsWith(`${factory.name}.`)) return name;
  return `${factory.name}.${name}`;
}

/**
 * A store, event, effect or domain as the panel sees it. A helper unit is shown
 * as part of its owner: `$email.updates`, `fetchFx.done`.
 */
export function createUnitRecord(
  node: Node,
  factory: FactoryInfo | undefined,
  findOwner: (helper: Node) => UnitRecord | undefined,
): UnitRecord {
  const meta = node.meta || {};
  const op: string = meta.op;
  const helperKind = helperKindOf(meta);
  const isDerived = !!meta.derived;
  const location = readLocation(meta);
  const ownName = hasOwnName(meta.name)
    ? shortName(String(meta.name))
    : anonymousName(op, node.id, location);
  const info: UnitInfo = {
    id: node.id,
    kind: op,
    name: helperKind ? ownName : nameInFactory(ownName, factory),
    sid: meta.sid || null,
    ...location,
    derived: isDerived,
    internal: helperKind !== null,
    isUnit: true,
    writable: op === 'store' && !isDerived,
    serializeIgnore: meta.serialize === 'ignore' || undefined,
    factory,
    domain: domainOf(node),
  };
  const owner = helperKind ? findOwner(node) : undefined;
  if (owner) {
    info.ownerId = owner.info.id;
    info.name = `${owner.info.name}.${helperKind}`;
    if (!info.file && owner.info.file) {
      info.file = owner.info.file;
      info.line = owner.info.line;
    }
  }
  const stateRef = op === 'store' ? (node.scope && node.scope.state) || meta.stateRef : undefined;
  return stateRef ? { node, info, stateRef } : { node, info };
}
