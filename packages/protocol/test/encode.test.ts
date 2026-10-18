import { describe, expect, it } from 'vitest';
import { encode } from '@deffector/protocol';

/** forest passes element drafts like this one: wide at every level */
function wideTree(width: number, depth: number): unknown {
  if (depth === 0) return 'leaf';
  return Array.from({ length: width }, () => ({ child: wideTree(width, depth - 1) }));
}

describe('encode: total budget', () => {
  it('keeps a wide, deep value small', () => {
    const value = wideTree(12, 4); // about 40 000 values
    const encoded = JSON.stringify(encode(value, { maxNodes: 500 }));
    expect(encoded.length).toBeLessThan(30_000);
    expect(JSON.stringify(encode(value)).length).toBeGreaterThan(encoded.length);
  });

  it('summarises what is left once the budget is spent', () => {
    const encoded = encode(
      Array.from({ length: 50 }, (_, i) => ({ i })),
      { maxNodes: 10 },
    ) as unknown[];
    expect(encoded.length).toBeLessThan(50);
    expect(encoded.at(-1)).toEqual({ $t: 'more', n: 50 - (encoded.length - 1) });
  });

  it('marks object keys it had no budget for', () => {
    const object = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, i]));
    const encoded = encode(object, { maxNodes: 5 }) as Record<string, unknown>;
    expect(encoded['…']).toMatchObject({ $t: 'more' });
  });

  it('leaves values within the budget untouched', () => {
    const value = { user: { name: 'Ann', tags: ['a', 'b'] }, count: 2 };
    expect(encode(value)).toEqual(value);
  });
});
