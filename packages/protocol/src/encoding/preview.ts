import { asTaggedValue, type Encoded, type EncodedRecord, type TaggedValue } from './encodedValue';

/** How many levels of nested objects `preview` opens before printing `{…}` / `Array(3)`. */
const PREVIEW_NESTING = 2;
const ARRAY_ITEMS_SHOWN = 5;
const MAP_ENTRIES_SHOWN = 3;
const SET_VALUES_SHOWN = 4;
const FIELDS_SHOWN = 4;
const CUT_STRING_SHOWN = 40;

function quote(text: string): string {
  return JSON.stringify(text);
}

/** `a, b, c` with a trailing `, …` when some items were left out. */
function formatList(parts: string[], hasMore: boolean): string {
  return `${parts.join(', ')}${hasMore ? ', …' : ''}`;
}

/** Tags printed without looking inside; null for containers (map, set, obj, inst). */
function previewLeafTag(taggedValue: TaggedValue): string | null {
  switch (taggedValue.$t) {
    case 'undef':
      return 'undefined';
    case 'bigint':
      return `${taggedValue.v}n`;
    case 'str':
      return `${quote(taggedValue.v.slice(0, CUT_STRING_SHOWN))}…(${taggedValue.len})`;
    case 'symbol':
      return `Symbol(${taggedValue.v})`;
    case 'fn':
      return `ƒ ${taggedValue.name}()`;
    case 'num':
    case 'date':
    case 'regexp':
    case 'dom':
      return taggedValue.v;
    case 'error':
      return `${taggedValue.name}: ${taggedValue.message}`;
    case 'promise':
      return 'Promise';
    case 'event':
      return `Event(${taggedValue.type})`;
    case 'window':
      return 'Window';
    case 'cycle':
      return '[Circular]';
    case 'more':
      return `…+${taggedValue.n}`;
    case 'depth':
      return `${taggedValue.cls}(${taggedValue.size})`;
    case 'binary':
      return `${taggedValue.kind}(${taggedValue.len})`;
    case 'weak':
      return taggedValue.kind;
    case 'throws':
      return '[getter threw]';
    default:
      return null;
  }
}

/**
 * `budget` is how many more levels may be opened; past it containers print as their size.
 * One function on purpose: arrays, maps, sets and objects recurse back into it.
 */
function previewValue(encoded: Encoded, budget: number): string {
  if (encoded === null) return 'null';
  if (typeof encoded === 'string') return quote(encoded);
  if (typeof encoded !== 'object') return String(encoded);
  const previewChild = (child: Encoded) => previewValue(child, budget - 1);

  if (Array.isArray(encoded)) {
    if (budget <= 0) return `Array(${encoded.length})`;
    const items = encoded.slice(0, ARRAY_ITEMS_SHOWN).map(previewChild);
    return `[${formatList(items, encoded.length > ARRAY_ITEMS_SHOWN)}]`;
  }

  const taggedValue = asTaggedValue(encoded);
  const leaf = taggedValue && previewLeafTag(taggedValue);
  if (leaf !== null) return leaf;

  if (taggedValue?.$t === 'map') {
    if (budget <= 0) return `Map(${taggedValue.size})`;
    const entries = taggedValue.entries
      .slice(0, MAP_ENTRIES_SHOWN)
      .map(([key, value]) => `${previewValue(key, 0)} => ${previewChild(value)}`);
    return `Map(${taggedValue.size}) {${formatList(entries, taggedValue.size > MAP_ENTRIES_SHOWN)}}`;
  }
  if (taggedValue?.$t === 'set') {
    if (budget <= 0) return `Set(${taggedValue.size})`;
    const values = taggedValue.values.slice(0, SET_VALUES_SHOWN).map(previewChild);
    return `Set(${taggedValue.size}) {${formatList(values, taggedValue.size > SET_VALUES_SHOWN)}}`;
  }

  // objects: plain, wrapped in `obj`, class instances; an unknown tag prints as a plain object
  let fields: EncodedRecord = encoded;
  let prefix = '';
  if (taggedValue?.$t === 'obj') fields = taggedValue.v;
  if (taggedValue?.$t === 'inst') {
    fields = taggedValue.v;
    prefix = `${taggedValue.cls} `;
  }
  const keys = Object.keys(fields);
  if (!keys.length) return `${prefix}{}`;
  if (budget <= 0) return `${prefix}{…}`;
  const parts = keys.slice(0, FIELDS_SHOWN).map((key) => `${key}: ${previewChild(fields[key])}`);
  return `${prefix}{${formatList(parts, keys.length > FIELDS_SHOWN)}}`;
}

/** Short one-line preview, Chrome-console style: {id: 1, name: "Ann", …} */
export function preview(encoded: Encoded, max = 60): string {
  const text = previewValue(encoded, PREVIEW_NESTING);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
