import { describe, expect, it } from 'vitest';
import type { Tx } from '@deffector/protocol';
import { transactionBatches } from '../src/agent/panelConnection';

const tx = (id: number, payloadChars = 10) =>
  ({ id, payload: 'x'.repeat(payloadChars) }) as unknown as Tx;

describe('transactionBatches', () => {
  it('splits by count', () => {
    const batches = transactionBatches(
      Array.from({ length: 5 }, (_, i) => tx(i)),
      2,
    );
    expect(batches.map((batch) => batch.length)).toEqual([2, 2, 1]);
  });

  it('splits by size so no message grows past the limit', () => {
    const txs = Array.from({ length: 10 }, (_, i) => tx(i, 1000));
    const batches = transactionBatches(txs, 200, 3500);
    expect(batches.length).toBeGreaterThan(1);
    for (const batch of batches) expect(JSON.stringify(batch).length).toBeLessThan(3600);
    expect(batches.flat().map((item) => item.id)).toEqual(txs.map((item) => item.id));
  });

  it('sends a transaction larger than the limit on its own', () => {
    const batches = transactionBatches([tx(1), tx(2, 5000), tx(3)], 200, 1000);
    expect(batches.map((batch) => batch.map((item) => item.id))).toEqual([[1], [2], [3]]);
  });
});

describe('AGENT_VERSION', () => {
  it('matches package.json, so the panel and traces report the real version', async () => {
    const { AGENT_VERSION } = await import('../src/agent/options');
    const { version } = (await import('../package.json')).default;
    expect(AGENT_VERSION).toBe(version);
  });
});
