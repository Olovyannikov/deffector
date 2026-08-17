import type { Node } from '../effector';

/** nesting levels searched for units inside a model object */
const MAX_MODEL_DEPTH = 4;

interface Collection {
  seen: Set<unknown>;
  ids: string[];
  isKnownUnit: (id: string) => boolean;
}

function isObjectLike(value: unknown): value is object {
  return !!value && (typeof value === 'object' || typeof value === 'function');
}

function collectUnitIds(value: unknown, depth: number, collection: Collection) {
  if (!isObjectLike(value) || collection.seen.has(value) || depth > MAX_MODEL_DEPTH) return;
  collection.seen.add(value);
  const node = (value as { graphite?: Node }).graphite;
  if (node && node.id && collection.isKnownUnit(node.id)) {
    collection.ids.push(node.id);
    return;
  }
  // a plain function is not a container of units
  if (typeof value === 'function' && !node) return;
  for (const key of Object.keys(value)) {
    if (key.startsWith('__')) continue;
    collectUnitIds((value as Record<string, unknown>)[key], depth + 1, collection);
  }
}

/** What `@@debug` returns (patronum#297). */
interface DebugDescription {
  name?: string;
  units?: Record<string, unknown>;
}

export interface ModelUnits {
  ids: string[];
  label: string;
}

/**
 * The units of a model instance: an object of units (nested objects too),
 * or anything with the `@@debug` method proposed in patronum#297.
 * Null when the instance is not an object at all.
 */
export function describeModel(
  instance: unknown,
  name: string | undefined,
  isKnownUnit: (id: string) => boolean,
): ModelUnits | null {
  if (!isObjectLike(instance)) return null;
  let units: unknown = instance;
  let label = name;
  const debug = (instance as { '@@debug'?: unknown })['@@debug'];
  if (typeof debug === 'function') {
    const description: unknown = debug.call(instance);
    if (description && typeof description === 'object') {
      const { units: describedUnits, name: describedName } = description as DebugDescription;
      units = describedUnits || {};
      label = label || describedName;
    }
  }
  const collection: Collection = { seen: new Set(), ids: [], isKnownUnit };
  collectUnitIds(units, 0, collection);
  return { ids: collection.ids, label: label || `model ${collection.ids[0] ?? '?'}` };
}
