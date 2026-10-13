import type { Page } from '@playwright/test';
import { test, waitForConnection } from './fixtures';
import { demoUrl } from './demos';
import {
  clickTimes,
  findUnitSid,
  openCommandPalette,
  openHealth,
  openTab,
  overrideEffect,
  panelRows,
  saveLogFilter,
} from './helpers';

// Not a test of behaviour: renders every tab for a visual check. Run with SHOTS=dir.
test.skip(!process.env.SHOTS, 'set SHOTS=<dir> to render screenshots');

const REACT = demoUrl('react');
const TABS = ['Stores', 'Effects', 'Graph', 'Traces', 'Health'];

const screenshotPath = (name: string) => `${process.env.SHOTS!}/${name}.png`;

/** Fills the panel with a bit of everything: counter, suggestions, blocked submit, bugs. */
async function produceActivity(app: Page) {
  await app.getByTestId('inc').click();
  await app.getByTestId('email').fill('ann@gm');
  await app.getByTestId('submit').click();
  await app.getByTestId('quick-fill').click();
  await app.getByTestId('terms').check();
  await app.getByTestId('submit').click();
  await app.getByTestId('greet-bug').click();
  await app.waitForTimeout(1200);
}

test('screenshots', async ({ context, openPanel }) => {
  const app = await context.newPage();
  await app.goto(REACT);
  for (const theme of ['dark', 'light'] as const) {
    const panel = await openPanel(app, `&theme=${theme}`);
    await panel.setViewportSize({ width: 1100, height: 520 });
    await waitForConnection(panel);
    // the light panel reuses what the dark one recorded
    if (theme === 'dark') await produceActivity(app);
    await panelRows(panel, 'quickFill').first().click();
    await panel.screenshot({ path: screenshotPath(`${theme}-log`) });
    for (const tab of TABS) {
      await openTab(panel, new RegExp(tab));
      if (tab === 'Stores') await panelRows(panel, 'email.$value').first().click();
      if (tab === 'Traces') await panel.getByRole('button', { name: 'Build JSON' }).click();
      await panel.waitForTimeout(300);
      await panel.screenshot({ path: screenshotPath(`${theme}-${tab.toLowerCase()}`) });
    }
    await openTab(panel, 'Log');
    await panelRows(panel, 'incremented').first().dblclick();
    await panel.waitForTimeout(300);
    await panel.screenshot({ path: screenshotPath(`${theme}-past`) });
    await panel.keyboard.press('Escape');
    await panel.close();
  }
});

test('screenshots of stage 3–5 features', async ({ context, openPanel }) => {
  const app = await context.newPage();
  await app.setViewportSize({ width: 1000, height: 640 });
  await app.goto(REACT);
  const panel = await openPanel(app, '&theme=dark');
  await panel.setViewportSize({ width: 1100, height: 560 });
  await waitForConnection(panel);
  await clickTimes(app.getByTestId('inc'), 2);
  await app.getByTestId('quick-fill').click();
  await app.getByTestId('submit').click();

  await panelRows(panel, 'quickFill').click();
  await openTab(panel, 'Sequence');
  await panel.screenshot({ path: screenshotPath('x-sequence') });

  await saveLogFilter(panel, '^(incr|decr)', 'counter');
  await panel.screenshot({ path: screenshotPath('x-filters') });
  await panel.keyboard.press('Escape');
  await panel.getByPlaceholder('Filter by name (regex)').fill('');

  await openCommandPalette(panel);
  await panel.keyboard.type('email');
  await panel.screenshot({ path: screenshotPath('x-palette') });
  await panel.keyboard.press('Escape');

  await panelRows(panel, 'incremented').first().dblclick();
  await app.waitForTimeout(300);
  await app.screenshot({ path: screenshotPath('x-app-locked') });
  await panel.screenshot({ path: screenshotPath('x-past-banner') });
  await panel.keyboard.press('Escape');

  await openTab(panel, 'Stores');
  await panel.getByRole('button', { name: /Snapshot/ }).click();
  const countSid = await findUnitSid(panel, '$count');
  await panel
    .getByPlaceholder(/Paste a snapshot/)
    .fill(JSON.stringify({ [countSid!]: 41, $terms: true, 'old-sid': 1 }, null, 2));
  await panel.screenshot({ path: screenshotPath('x-snapshot') });

  await overrideEffect(panel, 'signupFx', 'delay');
  await panel.getByRole('button', { name: 'Override' }).click();
  await panel.screenshot({ path: screenshotPath('x-overrides') });

  await openTab(panel, 'Graph');
  await panel.getByLabel('From', { exact: true }).fill('quickFill');
  await panel.getByLabel('To', { exact: true }).fill('$profileStrength');
  await panel.getByRole('button', { name: 'Path', exact: true }).click();
  await panel.waitForTimeout(300);
  await panel.screenshot({ path: screenshotPath('x-graph-path') });
  await panel.getByRole('button', { name: 'Clear', exact: true }).click();
  await panel.getByLabel('Group').selectOption('file');
  await panel.getByLabel('whole graph').check();
  await panel.getByLabel('operators').check();
  await panel.waitForTimeout(300);
  await panel.screenshot({ path: screenshotPath('x-graph-grouped') });

  // the lab: runaway loop, glitches, leaks
  const lab = await context.newPage();
  await lab.goto(demoUrl('lab'));
  const labPanel = await openPanel(lab, '&theme=light');
  await labPanel.setViewportSize({ width: 1100, height: 700 });
  await waitForConnection(labPanel);
  await lab.getByTestId('loop').click();
  await lab.getByTestId('price').click();
  await lab.getByTestId('ratio0').click();
  await clickTimes(lab.getByTestId('leak'), 4);
  await lab.getByTestId('timer-bug').click();
  await lab.waitForTimeout(800);
  await openHealth(labPanel);
  await labPanel.getByRole('button', { name: 'Check derived stores' }).click();
  await labPanel.waitForTimeout(300);
  await labPanel.screenshot({ path: screenshotPath('x-health-lab') });
  await openTab(labPanel, 'Log');
  await panelRows(labPanel, 'priceChanged').click();
  await labPanel.screenshot({ path: screenshotPath('x-stale-read') });
});
