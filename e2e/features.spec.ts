import { test, expect, waitForConnection } from './fixtures';
import { demoUrl } from './demos';
import {
  clickTimes,
  exportTrace,
  fillSignupForm,
  findUnitSid,
  importTrace,
  openCommandPalette,
  openHealth,
  openTab,
  overrideEffect,
  panelRows,
  readLiveScopeId,
  saveLogFilter,
} from './helpers';

const REACT = demoUrl('react');
const LAB = demoUrl('lab');

test.describe('time travel lock', () => {
  test('the past is covered: clicks do nothing, Esc in the page returns, clicks can be allowed', async ({
    openDemo,
  }) => {
    const { app, panel } = await openDemo(REACT);
    const increment = app.getByTestId('inc');
    const count = app.getByTestId('count');
    const veil = app.locator('deffector-past');
    await clickTimes(increment, 3);
    await panelRows(panel, 'incremented').first().dblclick();
    await expect(count).toHaveText('1');
    await expect(veil).toHaveCount(1);
    // a click lands on the veil, not on the button
    await increment.click({ force: true });
    await expect(count).toHaveText('1');
    // Esc inside the page goes back to the present
    await app.keyboard.press('Escape');
    await expect(count).toHaveText('3');
    await expect(veil).toHaveCount(0);
    // unlock: the past accepts clicks and they go to a branch
    await panelRows(panel, 'incremented').first().dblclick();
    await panel.getByLabel(/Block clicks/).uncheck();
    await expect(veil).toHaveCount(0);
    await increment.click();
    await expect(count).toHaveText('2');
    await expect(panel.locator('.row .bdg.branch').first()).toBeVisible();
    await panel.keyboard.press('Escape');
    await expect(count).toHaveText('3');
  });
});

test.describe('saved filters', () => {
  test('save, highlight, and stop recording matching transactions', async ({ openDemo }) => {
    const { app, panel } = await openDemo(REACT);
    const incrementRows = panelRows(panel, 'incremented');
    const decrementRows = panelRows(panel, 'decremented');
    await app.getByTestId('inc').click();
    await saveLogFilter(panel, '^incr', 'counter');
    await expect(panel.locator('.frow')).toHaveCount(1);
    await panel.keyboard.press('Escape');
    await panel.getByPlaceholder('Filter by name (regex)').fill('');
    // highlighted rows get the filter colour
    await expect(incrementRows.locator('.hlt[style*="background"]')).toHaveCount(1);
    // stop recording them: the counter changes, the log does not grow
    await panel.getByRole('button', { name: 'Saved filters' }).click();
    await panel.locator('.frow').getByLabel('Do not record').check();
    await panel.keyboard.press('Escape');
    const recordedIncrements = await incrementRows.count();
    await clickTimes(app.getByTestId('inc'), 2);
    await expect(app.getByTestId('count')).toHaveText('3');
    await app.getByTestId('dec').click();
    await expect(decrementRows).toHaveCount(1);
    expect(await incrementRows.count()).toBe(recordedIncrements);
    // jumping to the decrement still shows the right state: hidden transactions kept their deltas
    await decrementRows.dblclick();
    await expect(app.getByTestId('count')).toHaveText('2');
    await panel.keyboard.press('Escape');
    // filters are saved per app
    const savedFilters = await panel.evaluate(() => {
      const key = Object.keys(localStorage).find((name) => name.startsWith('deffector:filters:'));
      return key ? localStorage.getItem(key) : null;
    });
    expect(savedFilters).toContain('^incr');
  });
});

test.describe('snapshot', () => {
  test('paste { sid: value }, see the diff, apply', async ({ openDemo }) => {
    const { app, panel } = await openDemo(REACT);
    const countSid = await findUnitSid(panel, '$count');
    await openTab(panel, 'Stores');
    await panel.getByRole('button', { name: /Snapshot/ }).click();
    // a known sid, an unknown one, and a store matched by name
    await panel
      .getByPlaceholder(/Paste a snapshot/)
      .fill(JSON.stringify({ [countSid!]: 7, 'nope-sid': 1, $terms: true }));
    await expect(panel.locator('.snapdiff .kv')).toHaveCount(3);
    await expect(panel.locator('.snapdiff')).toContainText('no such store');
    await expect(panel.getByText('2 change(s)')).toBeVisible();
    await panel.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(app.getByTestId('count')).toHaveText('7');
    await expect(app.getByTestId('terms')).toBeChecked();
  });
});

test.describe('inspector extras', () => {
  test('a note on a transaction, the sequence diagram, a step link', async ({ openDemo }) => {
    const { app, panel } = await openDemo(REACT);
    const quickFillRow = panelRows(panel, 'quickFill');
    await app.getByTestId('quick-fill').click();
    await quickFillRow.click();
    await panel.getByRole('button', { name: 'Note', exact: true }).click();
    await panel.getByPlaceholder(/What is wrong here/).fill('strength flickers here');
    await panel.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(quickFillRow.locator('.bdg.note')).toBeVisible();
    await expect(panel.locator('.why.info')).toContainText('strength flickers here');
    await openTab(panel, 'Sequence');
    await expect(panel.locator('svg.seq')).toBeVisible();
    expect(await panel.locator('.sqh').count()).toBeGreaterThan(3);
    expect(await panel.locator('.sqe').count()).toBeGreaterThan(3);
  });

  test('file links copy the location when Sources is not available', async ({ openDemo }) => {
    const { panel } = await openDemo(REACT);
    await openTab(panel, 'Stores');
    await panelRows(panel, '$count').first().click();
    await panel.locator('.meta button.link').click();
    await expect(panel.locator('.toast')).toContainText('src/index.ts');
  });
});

test.describe('effects', () => {
  test('an override makes the next call fail, removing it restores the real handler', async ({
    openDemo,
  }) => {
    const { app, panel } = await openDemo(REACT);
    await overrideEffect(panel, 'signupFx', 'fail');
    await panel.getByLabel('JSON value').fill('Service unavailable (forced)');
    await panel.getByRole('button', { name: 'Override' }).click();
    await expect(panel.locator('details.fxo')).toContainText('reject with');
    await fillSignupForm(app, { email: 'zed@example.com', password: 'long-enough', name: 'Zed' });
    await app.getByTestId('submit').click();
    await expect(app.getByTestId('server-error')).toHaveText('Service unavailable (forced)');
    await panel.getByRole('button', { name: 'Remove all' }).click();
    await app.getByTestId('submit').click();
    await expect(app.getByTestId('user')).toContainText('Welcome, Zed');
  });
});

test.describe('command palette', () => {
  test('Ctrl+K finds a store and opens it', async ({ openDemo }) => {
    const { panel } = await openDemo(REACT);
    await openCommandPalette(panel);
    await expect(panel.locator('.pal')).toBeVisible();
    await panel.keyboard.type('$count');
    await panel.keyboard.press('Enter');
    await expect(panel.getByRole('tab', { name: 'Stores' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(panel.locator('.ih .t')).toHaveText('$count');
  });
});

test.describe('graph', () => {
  test('path between two units and grouping by file', async ({ openDemo }) => {
    const { panel } = await openDemo(REACT);
    await openTab(panel, 'Graph');
    await panel.getByLabel('From', { exact: true }).fill('incremented');
    // $isEven: .map stores get no name from the plugin
    await panel.getByLabel('To', { exact: true }).fill('$count → *');
    await panel.getByRole('button', { name: 'Path', exact: true }).click();
    await expect(panel.locator('.gtool .hint')).toContainText('Path: 3 units');
    await expect(panel.locator('.gn.hot')).toHaveCount(3);
    await panel.getByRole('button', { name: 'Clear', exact: true }).click();
    await panel.getByLabel('Group').selectOption('file');
    await panel.getByLabel('whole graph').check();
    const firstGroup = panel.locator('.gn.grp').first();
    await expect(firstGroup).toBeVisible();
    await firstGroup.dblclick();
  });
});

test.describe('health on the lab page', () => {
  test('emergency stop, stale read, exception, leak, out of scope', async ({
    context,
    openPanel,
  }) => {
    const app = await context.newPage();
    await app.goto(LAB);
    // The lab renders after dynamic imports, so `goto` can return before its
    // DeffectorProvider has registered the scope. A panel that connects earlier keeps
    // "global" as the live scope (the agent does not resend the timeline when a scope
    // is registered), and "Check derived stores" would then check the global scope.
    await expect(app.getByTestId('loop-count')).toBeVisible();
    const panel = await openPanel(app);
    await waitForConnection(panel);
    await expect
      .poll(() => readLiveScopeId(panel), { message: 'the panel checks the lab scope, not global' })
      .not.toBe('global');
    // an infinite loop: the page survives
    await app.getByTestId('loop').click();
    await expect(app.getByTestId('loop-count')).not.toHaveText('0');
    await app.getByTestId('price').click();
    await expect(app.getByTestId('logged')).toHaveText('20'); // the glitch: stale qty 1 × 20, not 3 × 20
    await app.getByTestId('ratio0').click();
    await clickTimes(app.getByTestId('leak'), 4);
    await app.getByTestId('timer-bug').click();
    await app.waitForTimeout(700);
    await expect(app.getByTestId('ticks')).toHaveText('0');
    const health = await openHealth(panel);
    await expect(health).toContainText('deffector stopped an infinite loop');
    await expect(health).toContainText('read $qty before it was updated');
    await expect(health).toContainText('Exception in');
    await expect(health).toContainText('$leaky created');
    await expect(health).toContainText('Call outside of scope: tick');
    await expect(health).toContainText('Cycle through events only');
    await panel.getByRole('button', { name: 'Check derived stores' }).click();
    await expect(health).toContainText('disagree with their sources');
  });

  test('server values for unknown sids', async ({ openDemo }) => {
    const { panel } = await openDemo(`${LAB}?hydrate`);
    const health = await openHealth(panel);
    await expect(health).toContainText('value(s) from the server have no store on the client');
    await expect(health).toContainText('server-only-sid');
  });
});

test.describe('trace focus', () => {
  test('export with the selected step, replay opens at that step', async ({ openDemo }) => {
    const recording = await openDemo(REACT);
    await clickTimes(recording.app.getByTestId('inc'), 4);
    const secondIncrement = panelRows(recording.panel, 'incremented').nth(1);
    await secondIncrement.click();
    const stepId = Number((await secondIncrement.locator('.c-n').textContent())!.trim());
    const trace = await exportTrace(recording.panel, stepId);
    expect(trace.meta.focus).toBe(stepId);

    const replaying = await openDemo(REACT);
    await importTrace(replaying.panel, trace);
    await expect(replaying.panel.getByLabel('Open at step')).toHaveValue(`#step=${stepId}`);
    await replaying.panel.getByRole('button', { name: 'Apply instantly' }).click();
    // the app shows the state right after the second increment
    await expect(replaying.app.getByTestId('count')).toHaveText('2');
    await expect(replaying.panel.locator('.banner')).toContainText('Viewing transaction');
  });
});
