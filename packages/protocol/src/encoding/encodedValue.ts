/**
 * Structured-clone-safe value encoding with type tags.
 *
 * Store values and payloads can be anything: Map, Set, Date, class instances,
 * DOM nodes, cyclic objects, functions. The panel lives in another process, so
 * values cross a postMessage boundary, and traces are written to JSON files.
 * `encode` turns any value into JSON-safe data, `decode` restores what can be
 * restored, and `preview` prints a short one-line form for the UI.
 *
 * Tagged values are objects with a `$t` key. A plain object that itself has a
 * `$t` key is wrapped as `{ $t: 'obj', v: {...} }` so decoding stays unambiguous.
 */

export type Encoded = null | boolean | number | string | Encoded[] | { [key: string]: Encoded };

/** An encoded plain object: the fields of an object or a class instance. */
export type EncodedRecord = Record<string, Encoded>;

/**
 * Every tag the encoder writes, with its fields. This is a wire format (saved traces
 * contain it): tag names and field names must not change.
 */
export type TaggedValue =
  | { $t: 'undef' }
  /** numbers JSON can't hold */
  | { $t: 'num'; v: 'NaN' | 'Infinity' | '-Infinity' | '-0' }
  | { $t: 'bigint'; v: string }
  /** `v` is the symbol description */
  | { $t: 'symbol'; v: string }
  | { $t: 'fn'; name: string }
  /** a string cut to `maxString` characters; `len` is the full length */
  | { $t: 'str'; v: string; len: number }
  | { $t: 'date'; v: string }
  /** `v` is the regexp source with flags: `/a+/gi` */
  | { $t: 'regexp'; v: string }
  | { $t: 'error'; name: string; message: string; stack: string | null }
  | { $t: 'map'; entries: [Encoded, Encoded][]; size: number }
  | { $t: 'set'; values: Encoded[]; size: number }
  /** a plain object that has its own `$t` key */
  | { $t: 'obj'; v: EncodedRecord }
  /** an instance of a class: `cls` is the constructor name */
  | { $t: 'inst'; cls: string; v: EncodedRecord }
  /** `v` describes the node: `<div#app.main>` */
  | { $t: 'dom'; v: string }
  | { $t: 'event'; type: string }
  | { $t: 'window' }
  | { $t: 'promise' }
  /** the value is already being encoded higher up the tree */
  | { $t: 'cycle' }
  /** nested deeper than `maxDepth`: only the class and the size are kept */
  | { $t: 'depth'; cls: string; size: number }
  /** `n` more items or keys were left out (`maxItems`, `maxKeys`) */
  | { $t: 'more'; n: number }
  /** typed arrays and ArrayBuffer: only the kind and the byte length are kept */
  | { $t: 'binary'; kind: string; len: number }
  | { $t: 'weak'; kind: string }
  /** reading the property threw */
  | { $t: 'throws'; message: string };

export type TagName = TaggedValue['$t'];

export type Tagged<Tag extends TagName> = Extract<TaggedValue, { $t: Tag }>;

export function tagged<Tag extends TagName>(
  tag: Tag,
  fields?: Omit<Tagged<Tag>, '$t'>,
): Tagged<Tag> {
  // `$t` goes first: encoded values are compared by their JSON text
  return { $t: tag, ...fields } as Tagged<Tag>;
}

/** The tagged form of an encoded object, or null for plain objects, arrays and primitives. */
export function asTaggedValue(encoded: Encoded): TaggedValue | null {
  if (encoded === null || typeof encoded !== 'object' || Array.isArray(encoded)) return null;
  // only the encoder writes a string `$t`: plain objects that have one are wrapped in `obj`
  return typeof encoded.$t === 'string' ? (encoded as TaggedValue) : null;
}

export function isTagged<Tag extends TagName>(encoded: Encoded, tag: Tag): encoded is Tagged<Tag> {
  return asTaggedValue(encoded)?.$t === tag;
}

/** Equality by JSON text: exact for values encoded from equal inputs (key order counts). */
export function encodedEqual(a: Encoded, b: Encoded): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
