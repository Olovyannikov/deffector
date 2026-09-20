import { preview, type Encoded } from '@deffector/protocol';

type EncodedObject = Record<string, Encoded>;

/** What a value tree opens into: array items, object fields, Map entries, Set values. */
export function childEntries(value: Encoded): [string, Encoded][] | null {
  if (value === null || typeof value !== 'object') return null;
  if (Array.isArray(value)) return value.map((item, index) => [String(index), item]);
  switch (value.$t) {
    case undefined:
      return Object.entries(value);
    case 'obj':
    case 'inst':
      return Object.entries(value.v as EncodedObject);
    case 'map':
      return (value.entries as Encoded[][]).map(([key, item]) => [preview(key, 30), item]);
    case 'set':
      return (value.values as Encoded[]).map((item, index) => [String(index), item]);
    default:
      return null;
  }
}
