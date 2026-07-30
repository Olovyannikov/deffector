import type { Node } from '../effector';
import { operatorName, shortName } from './naming';
import { readLocation } from './sourceLocation';
import type { UnitRecord } from './types';

type UnitsById = ReadonlyMap<string, UnitRecord>;

function nameOf(node: Node, units: UnitsById): string {
  const record = units.get(node.id);
  if (record) return record.info.name;
  const meta = node.meta || {};
  return String(meta.name || meta.op || node.id);
}

/**
 * An operator node (on, map, sample, combine, watch…) met in a step: named after
 * the units around it and shown at the location of the first user unit it touches.
 */
export function createOperatorRecord(node: Node, units: UnitsById): UnitRecord {
  const meta = node.meta || {};
  const op: string = meta.op;
  const targets = node.next || [];
  const owners = (node.family?.owners || []).filter(
    (owner) => !targets.includes(owner) && owner !== node,
  );
  const name = operatorName({
    op,
    ownName: meta.name,
    targets: targets.map((target) => nameOf(target, units)),
    owners: owners.map((owner) => nameOf(owner, units)),
  });
  const relatedUnits = [...targets, ...owners]
    .map((related) => units.get(related.id))
    .filter((record): record is UnitRecord => !!record);
  const writesOnlyToHelpers =
    relatedUnits.length > 0 &&
    targets.length > 0 &&
    targets.every((target) => units.get(target.id)?.info.internal);
  // an effect handler is user code even when only helper units surround it
  const touchesOnlyHelpers =
    op !== 'fx' && relatedUnits.length > 0 && relatedUnits.every((record) => record.info.internal);
  const location = readLocation(meta);
  const firstUserUnit = relatedUnits.find((record) => !record.info.internal);
  return {
    node,
    info: {
      id: node.id,
      kind: op,
      name: shortName(name),
      sid: meta.sid || null,
      ...location,
      file: location.file || firstUserUnit?.info.file,
      line: location.line ?? firstUserUnit?.info.line,
      derived: false,
      internal: writesOnlyToHelpers || touchesOnlyHelpers,
      isUnit: false,
      writable: false,
      ownerId: firstUserUnit?.info.id,
      targets: targets
        .map((target) => units.get(target.id))
        .filter((target): target is UnitRecord => !!target)
        .map((target) => (target.info.internal && target.info.ownerId) || target.info.id),
    },
  };
}
