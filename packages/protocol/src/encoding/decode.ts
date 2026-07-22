import { asTaggedValue, isTagged, type Encoded } from './encodedValue';

/** Tags that stand for a value which can't be restored: a description, not the value. */
const LOSSY_TAGS = new Set<string>([
  'fn',
  'dom',
  'event',
  'promise',
  'cycle',
  'depth',
  'more',
  'window',
  'weak',
  'binary',
  'throws',
  'symbol',
  // a cut string and a class instance (its prototype is lost)
  'str',
  'inst',
]);

/** True when decode(encoded) gives back an equivalent value (safe to replay). */
export function isLossless(encoded: Encoded): boolean {
  if (encoded === null || typeof encoded !== 'object') return true;
  if (Array.isArray(encoded)) return encoded.every(isLossless);
  const taggedValue = asTaggedValue(encoded);
  if (!taggedValue) return Object.values(encoded).every(isLossless);
  if (LOSSY_TAGS.has(taggedValue.$t)) return false;
  switch (taggedValue.$t) {
    case 'map':
      return (
        taggedValue.entries.every(isLossless) && taggedValue.entries.length === taggedValue.size
      );
    case 'set':
      return taggedValue.values.every(isLossless) && taggedValue.values.length === taggedValue.size;
    case 'obj':
      return isLossless(taggedValue.v);
    default:
      return true;
  }
}

function decodeRegExp(source: string): RegExp {
  const match = /^\/(.*)\/([a-z]*)$/s.exec(source);
  return match ? new RegExp(match[1], match[2]) : new RegExp(source);
}

function decodeError(encoded: { name: string; message: string }): Error {
  const error = new Error(encoded.message);
  error.name = encoded.name;
  return error;
}

export function decode(encoded: Encoded): unknown {
  if (encoded === null || typeof encoded !== 'object') return encoded;
  if (Array.isArray(encoded)) return encoded.filter((item) => !isTagged(item, 'more')).map(decode);
  const taggedValue = asTaggedValue(encoded);
  if (!taggedValue) {
    const fields: Record<string, unknown> = {};
    // `…` holds the count of keys left out by the encoder
    for (const key of Object.keys(encoded)) if (key !== '…') fields[key] = decode(encoded[key]);
    return fields;
  }
  switch (taggedValue.$t) {
    case 'num':
      return Number(taggedValue.v);
    case 'bigint':
      return typeof BigInt === 'function' ? BigInt(taggedValue.v) : Number(taggedValue.v);
    case 'str':
      return taggedValue.v;
    case 'date':
      return new Date(taggedValue.v);
    case 'regexp':
      return decodeRegExp(taggedValue.v);
    case 'error':
      return decodeError(taggedValue);
    case 'map':
      return new Map(taggedValue.entries.map(([key, value]) => [decode(key), decode(value)]));
    case 'set':
      return new Set(taggedValue.values.map(decode));
    case 'obj':
    case 'inst':
      return decode(taggedValue.v);
    case 'symbol':
      return Symbol(taggedValue.v);
    default:
      // `undef` and the lossy tags
      return undefined;
  }
}
