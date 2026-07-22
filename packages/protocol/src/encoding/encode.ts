import { tagged, type Encoded, type EncodedRecord } from './encodedValue';
import { maskString } from './masking';
import { describeClassName, describeDomNode, isDomEvent, isDomNode } from './objectDescription';

export interface EncodeOptions {
  maxDepth?: number;
  maxKeys?: number;
  maxItems?: number;
  maxString?: number;
  /** Returns true for object keys whose values must be masked (passwords, tokens). */
  mask?: (key: string, path: string) => boolean;
  /** Collects paths that were masked. */
  masked?: string[];
}

const DEFAULT_LIMITS = { maxDepth: 8, maxKeys: 100, maxItems: 100, maxString: 2000 };

/** Lines of an error stack kept: enough to find the throwing code, small enough to send. */
const STACK_LINES = 6;

function encodeString(text: string, maxString: number): Encoded {
  if (text.length <= maxString) return text;
  return tagged('str', { v: text.slice(0, maxString), len: text.length });
}

/** NaN, ±Infinity and -0 do not survive JSON. */
function encodeNumber(number: number): Encoded {
  if (Number.isNaN(number)) return tagged('num', { v: 'NaN' });
  if (!Number.isFinite(number)) return tagged('num', { v: number > 0 ? 'Infinity' : '-Infinity' });
  if (Object.is(number, -0)) return tagged('num', { v: '-0' });
  return number;
}

/** Everything that is not an object: primitives and functions. */
function encodeScalar(value: unknown, maxString: number): Encoded {
  switch (typeof value) {
    case 'string':
      return encodeString(value, maxString);
    case 'number':
      return encodeNumber(value);
    case 'boolean':
      return value;
    case 'bigint':
      return tagged('bigint', { v: value.toString() });
    case 'symbol':
      return tagged('symbol', { v: value.description ?? '' });
    case 'function':
      return tagged('fn', { name: value.name || 'anonymous' });
    default:
      // objects are encoded by the caller, so only `undefined` is left
      return tagged('undef');
  }
}

function encodeError(error: Error): Encoded {
  return tagged('error', {
    name: error.name,
    message: error.message,
    stack:
      typeof error.stack === 'string'
        ? error.stack.split('\n').slice(0, STACK_LINES).join('\n')
        : null,
  });
}

/**
 * Objects encoded as one tag, without walking their contents: they can't be cloned,
 * are huge (window, DOM), or are better described than dumped.
 * Returns undefined for objects whose contents should be walked.
 */
function encodeOpaqueObject(object: object): Encoded | undefined {
  if (typeof window !== 'undefined' && object === (window as unknown)) return tagged('window');
  if (isDomNode(object)) return tagged('dom', { v: describeDomNode(object) });
  if (isDomEvent(object)) return tagged('event', { type: object.type });
  if (object instanceof Date) {
    return tagged('date', {
      v: Number.isNaN(object.getTime()) ? 'Invalid Date' : object.toISOString(),
    });
  }
  if (object instanceof RegExp) return tagged('regexp', { v: String(object) });
  if (object instanceof Error) return encodeError(object);
  if (typeof Promise !== 'undefined' && object instanceof Promise) return tagged('promise');
  if (ArrayBuffer.isView(object) || object instanceof ArrayBuffer) {
    return tagged('binary', {
      kind: describeClassName(object) || 'ArrayBuffer',
      len: object.byteLength,
    });
  }
  if (typeof WeakMap !== 'undefined' && (object instanceof WeakMap || object instanceof WeakSet))
    return tagged('weak', { kind: describeClassName(object) || '' });
  return undefined;
}

/** An object nested deeper than `maxDepth`: keep only what it is and how big. */
function describeTooDeep(object: object): Encoded {
  if (Array.isArray(object)) return tagged('depth', { cls: 'Array', size: object.length });
  const size =
    object instanceof Map || object instanceof Set ? object.size : Object.keys(object).length;
  return tagged('depth', { cls: describeClassName(object) || 'Object', size });
}

/** The error message of a getter that threw, whatever was thrown. */
function describeThrown(thrown: unknown): string {
  return String((thrown as { message?: unknown } | null)?.message ?? thrown);
}

/**
 * One `encode` call. `path` is the dotted path of the current value (`user.tags[2]`):
 * the mask callback sees it and masked paths are reported with it.
 */
class Encoder {
  private readonly seen = new WeakSet<object>();

  private readonly options: EncodeOptions & typeof DEFAULT_LIMITS;

  constructor(options: EncodeOptions & typeof DEFAULT_LIMITS) {
    this.options = options;
  }

  value(value: unknown, depth: number, path: string): Encoded {
    if (value === null) return null;
    if (typeof value === 'object') return this.object(value, depth, path);
    return encodeScalar(value, this.options.maxString);
  }

  private object(object: object, depth: number, path: string): Encoded {
    if (this.seen.has(object)) return tagged('cycle');
    const opaque = encodeOpaqueObject(object);
    if (opaque !== undefined) return opaque;
    if (depth >= this.options.maxDepth) return describeTooDeep(object);
    // only the current branch is tracked: an object met twice side by side is not a cycle
    this.seen.add(object);
    try {
      if (Array.isArray(object)) return this.array(object, depth, path);
      if (object instanceof Map) return this.map(object, depth, path);
      if (object instanceof Set) return this.set(object, depth, path);
      return this.fields(object, depth, path);
    } finally {
      this.seen.delete(object);
    }
  }

  private array(array: unknown[], depth: number, path: string): Encoded {
    const items: Encoded[] = [];
    const count = Math.min(array.length, this.options.maxItems);
    for (let i = 0; i < count; i++) items.push(this.value(array[i], depth + 1, `${path}[${i}]`));
    if (array.length > count) items.push(tagged('more', { n: array.length - count }));
    return items;
  }

  private map(map: Map<unknown, unknown>, depth: number, path: string): Encoded {
    const entries: [Encoded, Encoded][] = [];
    for (const [key, entryValue] of map) {
      if (entries.length >= this.options.maxItems) break;
      entries.push([
        this.value(key, depth + 1, `${path}.<key>`),
        this.value(entryValue, depth + 1, `${path}.${String(key)}`),
      ]);
    }
    return tagged('map', { entries, size: map.size });
  }

  private set(set: Set<unknown>, depth: number, path: string): Encoded {
    const values: Encoded[] = [];
    for (const item of set) {
      if (values.length >= this.options.maxItems) break;
      values.push(this.value(item, depth + 1, `${path}[]`));
    }
    return tagged('set', { values, size: set.size });
  }

  private fields(object: object, depth: number, path: string): Encoded {
    const fields: EncodedRecord = {};
    const keys = Object.keys(object);
    const count = Math.min(keys.length, this.options.maxKeys);
    for (let i = 0; i < count; i++) {
      const key = keys[i];
      fields[key] = this.field(object, key, depth, path ? `${path}.${key}` : key);
    }
    if (keys.length > count) fields['…'] = tagged('more', { n: keys.length - count });
    const className = describeClassName(object);
    if (className) return tagged('inst', { cls: className, v: fields });
    if ('$t' in fields) return tagged('obj', { v: fields });
    return fields;
  }

  private field(object: object, key: string, depth: number, fieldPath: string): Encoded {
    let fieldValue: unknown;
    try {
      fieldValue = (object as Record<string, unknown>)[key];
    } catch (thrown) {
      return tagged('throws', { message: describeThrown(thrown) });
    }
    const { mask, masked } = this.options;
    if (mask && typeof fieldValue === 'string' && mask(key, fieldPath)) {
      masked?.push(fieldPath);
      return maskString(fieldValue);
    }
    return this.value(fieldValue, depth + 1, fieldPath);
  }
}

export function encode(value: unknown, options: EncodeOptions = {}): Encoded {
  return new Encoder({ ...DEFAULT_LIMITS, ...options }).value(value, 0, '');
}
