import { decode, type Encoded, type UnitInfo } from '@deffector/protocol';
import { errorMessage } from '../common';

export type ParsedSnapshot = { value: Record<string, unknown> } | { error: string } | null;

/** A pasted snapshot must be a JSON object; empty text is no snapshot yet (null). */
export function parseSnapshot(text: string, invalidJsonTitle: string): ParsedSnapshot {
  if (!text.trim()) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return { error: invalidJsonTitle };
    return { value: value as Record<string, unknown> };
  } catch (error) {
    return { error: `${invalidJsonTitle}: ${errorMessage(error)}` };
  }
}

/** Current values of the writable stores keyed by sid (or name without one), like serialize(scope). */
export function currentSnapshot(
  writableStores: readonly UnitInfo[],
  values: Record<string, Encoded> | null,
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  if (!values) return snapshot;
  for (const unit of writableStores)
    if (unit.id in values && !unit.serializeIgnore)
      snapshot[unit.sid || unit.name] = decode(values[unit.id]);
  return snapshot;
}

export interface SnapshotDiffEntry {
  /** the key as pasted: a sid or a store name */
  key: string;
  /** the store it refers to; undefined when there is no such store */
  unit: UnitInfo | undefined;
  pasted: unknown;
  current: unknown;
  isSame: boolean;
}

/** Each pasted key against the store it names (by sid first, then by name) and its current value. */
export function diffSnapshot(
  pasted: Record<string, unknown>,
  writableStores: readonly UnitInfo[],
  values: Record<string, Encoded> | null,
): SnapshotDiffEntry[] {
  const bySid = new Map<string, UnitInfo>();
  for (const unit of writableStores) if (unit.sid) bySid.set(unit.sid, unit);
  const byName = new Map(writableStores.map((unit) => [unit.name, unit]));
  return Object.entries(pasted).map(([key, value]) => {
    const unit = bySid.get(key) || byName.get(key);
    const current = unit && values && unit.id in values ? decode(values[unit.id]) : undefined;
    const isSame = unit ? JSON.stringify(current) === JSON.stringify(value) : false;
    return { key, unit, pasted: value, current, isSame };
  });
}
