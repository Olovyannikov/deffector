import { writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { demoUrl } from './demos';
import { openTab } from './helpers';

// Measurements for the report, not a pass/fail gate. Run: PERF=<out.json> npx playwright test e2e/perf.spec.ts
test.skip(!process.env.PERF, 'set PERF=<file> to measure');
test.setTimeout(600_000);

const LAB = demoUrl('lab');
const KICKS_PER_MEASUREMENT = 15;

/** The lab's `window.__lab` and the parts of the panel store this file reads. */
interface PerfWindow {
  __lab: { kick: () => Promise<unknown> };
  __deffectorPanel: {
    store: {
      units: Map<string, { id: string; name: string }>;
      txs: { steps: unknown[]; flags: { truncated?: boolean }; duration: number }[];
      setUI: (patch: Record<string, unknown>) => void;
    };
  };
}

const GRAPH_SIZES = [
  { buttonTestId: 'build-1k', unitCount: 1100 },
  { buttonTestId: 'build-5k', unitCount: 5500 },
  { buttonTestId: 'build-20k', unitCount: 22000 },
];

const median = (values: number[]) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const roundToTenth = (value: number) => Math.round(value * 10) / 10;

/** Median time of a big graph kick in the lab page, in ms. */
async function measureKicks(page: Page) {
  const durations: number[] = [];
  for (let i = 0; i < KICKS_PER_MEASUREMENT; i++)
    durations.push(
      await page.evaluate(async () => {
        const startedAt = performance.now();
        await (window as unknown as PerfWindow).__lab.kick();
        return performance.now() - startedAt;
      }),
    );
  return roundToTenth(median(durations));
}

/** Builds the graph and returns the lab's summary line. */
async function buildGraph(page: Page, buttonTestId: string) {
  await page.getByTestId(buttonTestId).click();
  const info = page.getByTestId('big-info');
  await expect(info).toContainText('units');
  return info.textContent();
}

/**
 * Changes the panel's graph view and measures the time until it shows more than
 * `minNodes` nodes matching `selector`, in ms, and how many nodes it shows then.
 */
async function measureGraphView(
  panel: Page,
  uiPatch: Record<string, unknown>,
  { selector, minNodes, timeout }: { selector: string; minNodes: number; timeout: number },
) {
  const startedAt = Date.now();
  await panel.evaluate((patch) => {
    (window as unknown as PerfWindow).__deffectorPanel.store.setUI(patch);
  }, uiPatch);
  await expect.poll(() => panel.locator(selector).count(), { timeout }).toBeGreaterThan(minNodes);
  return { ms: Date.now() - startedAt, nodes: await panel.locator('.gn').count() };
}

test('overhead and big graphs', async ({ context, openPanel }) => {
  const report: Record<string, unknown> = {};
  for (const { buttonTestId, unitCount } of GRAPH_SIZES) {
    const row: Record<string, unknown> = {};
    report[unitCount] = row;

    // 1. no agent at all
    const bare = await context.newPage();
    await bare.goto(`${LAB}?noagent`);
    row.noAgent = { build: await buildGraph(bare, buttonTestId), kickMs: await measureKicks(bare) };
    await bare.close();

    // 2. agent installed, no panel: paused after the grace period
    const page = await context.newPage();
    await page.goto(`${LAB}?grace=200`);
    await page.waitForTimeout(400);
    row.paused = { build: await buildGraph(page, buttonTestId), kickMs: await measureKicks(page) };

    // 3. open the panel: time until it has all units
    const panelOpenedAt = Date.now();
    const panel = await openPanel(page);
    await expect
      .poll(
        () =>
          panel.evaluate(() => (window as unknown as PerfWindow).__deffectorPanel.store.units.size),
        { timeout: 120_000 },
      )
      .toBeGreaterThan(unitCount);
    row.panelConnectMs = Date.now() - panelOpenedAt;

    // 4. recording with the panel open
    row.recording = { kickMs: await measureKicks(page) };
    await panel.waitForTimeout(400);
    row.lastTx = await panel.evaluate(() => {
      const { txs } = (window as unknown as PerfWindow).__deffectorPanel.store;
      const transaction = txs[txs.length - 1];
      return {
        steps: transaction?.steps.length,
        truncated: !!transaction?.flags.truncated,
        kernelMs: transaction?.duration,
      };
    });

    // 5. graph: neighbourhood of one unit
    await openTab(panel, 'Graph');
    await expect(panel.locator('.gwrap .empty, .gwrap svg').first()).toBeVisible({
      timeout: 60_000,
    });
    const middleFeature = Math.floor(unitCount / 22);
    const selectedAt = Date.now();
    await panel.evaluate((unitName) => {
      const { store } = (window as unknown as PerfWindow).__deffectorPanel;
      const unit = [...store.units.values()].find((candidate) => candidate.name === unitName);
      store.setUI({ selectedUnit: unit?.id ?? null });
    }, `$f${middleFeature}.value`);
    await expect(panel.locator('.gn').first()).toBeVisible({ timeout: 60_000 });
    row.graphNeighbourhood = {
      ms: Date.now() - selectedAt,
      nodes: await panel.locator('.gn').count(),
    };

    // 6. grouped by file, everything shown
    row.graphGroupedAll = await measureGraphView(
      panel,
      { graphGroup: 'file', graphAll: true, selectedUnit: null },
      { selector: '.gn.grp', minNodes: 10, timeout: 120_000 },
    );

    // 7. every unit at once (the worst case the UI allows)
    if (unitCount <= 5500) {
      row.graphAll = await measureGraphView(
        panel,
        { graphGroup: 'none', graphAll: true },
        { selector: '.gn', minNodes: unitCount * 0.5, timeout: 180_000 },
      );
    }
    await panel.close();
    await page.close();
  }
  writeFileSync(process.env.PERF!, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
});
