import { test, expect } from './fixtures';
import { demoUrl } from './demos';
import { clickTimes, openHealth, panelRows } from './helpers';

test('global mode: in-place time travel with a warning', async ({ openDemo }) => {
  const { app, panel } = await openDemo(demoUrl('globalMode'));
  const count = app.getByTestId('count');
  await clickTimes(app.getByTestId('inc'), 3);
  await expect(count).toHaveText('3');
  await panelRows(panel, 'incremented').first().dblclick();
  await expect(count).toHaveText('1');
  await expect(panel.locator('.banner.warn')).toContainText('Global mode');
  await panel.keyboard.press('Escape');
  await expect(count).toHaveText('3');
  await openHealth(panel);
  await expect(panel.locator('.hrow', { hasText: /fork/ }).first()).toBeVisible();
});

test('no babel plugin: works, warns about sids, traces match by name', async ({ openDemo }) => {
  const { app, panel } = await openDemo(demoUrl('noPlugin'));
  const count = app.getByTestId('count');
  await clickTimes(app.getByTestId('inc'), 2);
  // without the plugin an event may have no name
  await panelRows(panel, /incremented|event/)
    .first()
    .dblclick();
  await expect(count).toHaveText('1');
  await panel.keyboard.press('Escape');
  await expect(count).toHaveText('2');
  await openHealth(panel);
  await expect(panel.locator('.hrow', { hasText: /sid/ }).first()).toBeVisible();
});
