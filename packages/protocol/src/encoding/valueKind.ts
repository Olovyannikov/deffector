import type { Encoded } from './encodedValue';

/** Kind of an encoded value for syntax colouring in the panel. */
export function valueKind(
  encoded: Encoded,
): 'string' | 'number' | 'keyword' | 'object' | 'special' {
  if (encoded === null || typeof encoded === 'boolean') return 'keyword';
  if (typeof encoded === 'number') return 'number';
  if (typeof encoded === 'string') return 'string';
  if (Array.isArray(encoded)) return 'object';
  const tag = encoded.$t;
  if (tag === 'undef') return 'keyword';
  if (tag === 'num' || tag === 'bigint') return 'number';
  if (tag === 'str' || tag === 'date' || tag === 'regexp') return 'string';
  if (tag === undefined || tag === 'obj' || tag === 'inst' || tag === 'map' || tag === 'set')
    return 'object';
  return 'special';
}
