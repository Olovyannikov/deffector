import { test, expect, waitForConnection } from './fixtures';
import { demoUrl } from './demos';
import {
  clickTimes,
  exportTrace,
  fillSignupForm,
  openHealth,
  openTab,
  panelRows,
  replayTraceInstantly,
} from './helpers';

const DEMOS = [
  { name: 'react', url: demoUrl('react'), initialCount: 0 },
  { name: 'vue', url: demoUrl('vue'), initialCount: 0 },
  { name: 'solid', url: demoUrl('solid'), initialCount: 0 },
  // the server increments twice before rendering, the client hydrates with 2
  { name: 'next', url: demoUrl('next'), initialCount: 2 },
];

for (const { name: demo, url, initialCount } of DEMOS)
  test.describe(demo, () => {
    /** the counter after `increments` clicks */
    const countAfter = (increments: number) => String(initialCount + increments);

    test('panel connects, records transactions and travels back in time', async ({
      context,
      openPanel,
    }) => {
      const app = await context.newPage();
      const pageErrors: string[] = [];
      app.on('pageerror', (error) => pageErrors.push(error.message));
      await app.goto(url);
      const count = app.getByTestId('count');
      await expect(count).toHaveText(countAfter(0));

      const panel = await openPanel(app);
      await waitForConnection(panel, 'effector 23.4.4');

      await clickTimes(app.getByTestId('inc'), 3);
      await expect(count).toHaveText(countAfter(3));

      const incrementRows = panelRows(panel, 'incremented');
      await expect(incrementRows).toHaveCount(3);
      await expect(incrementRows.nth(2)).toContainText(
        `$count ${countAfter(2)} → ${countAfter(3)}`,
      );

      // jump to the first increment: the app renders a fork of that moment
      await incrementRows.nth(0).dblclick();
      await expect(count).toHaveText(countAfter(1));
      await expect(panel.locator('.banner')).toContainText('Viewing transaction');

      // step forward with the keyboard, then back to the present
      await panel.keyboard.press('Control+]');
      await expect(count).toHaveText(countAfter(2));
      await panel.keyboard.press('Escape');
      await expect(count).toHaveText(countAfter(3));
      await expect(panel.locator('.banner')).toHaveCount(0);
      expect(pageErrors).toEqual([]);
    });

    test('blocked submit, out-of-scope bug and double update are flagged', async ({ openDemo }) => {
      const { app, panel } = await openDemo(url);

      await app.getByTestId('submit').click();
      await expect(panelRows(panel, 'submitPressed')).toContainText('filter = false');

      await app.getByTestId('quick-fill').click();
      await expect(panelRows(panel, 'quickFill')).toContainText('2×');

      await app.getByTestId('greet-bug').click();
      await expect(panel.locator('.row.err')).toHaveCount(1, { timeout: 5000 });
      await expect(app.getByTestId('greeting')).toHaveText('—');

      await openHealth(panel);
      await expect(panel.locator('.hrow', { hasText: /scope/i }).first()).toBeVisible();
    });

    test('store editing: live edit changes the app and is logged', async ({ openDemo }) => {
      const { app, panel } = await openDemo(url);
      await openTab(panel, 'Stores');
      await panelRows(panel, '$count').first().click();
      await panel.getByLabel('Set your own value').fill('41');
      await panel.getByRole('button', { name: 'Apply', exact: true }).click();
      await expect(app.getByTestId('count')).toHaveText('41');
      await app.getByTestId('inc').click();
      await expect(app.getByTestId('count')).toHaveText('42');
      await openTab(panel, 'Log');
      await expect(panelRows(panel, 'devtools')).toHaveCount(1);
    });

    test('trace export → replay in a fresh page reproduces the state without network', async ({
      openDemo,
    }) => {
      const recording = await openDemo(url);
      await fillSignupForm(recording.app, {
        email: 'bob@example.com',
        password: 'hunter2-long',
        name: 'Bob',
      });
      await recording.app.getByTestId('submit').click();
      await expect(recording.app.getByTestId('user')).toContainText('Welcome, Bob');
      const userText = await recording.app.getByTestId('user').textContent();

      const trace = await exportTrace(recording.panel);
      expect(trace.format).toBe('deffector-trace@1');
      expect(JSON.stringify(trace)).not.toContain('hunter2-long');

      // another developer: fresh page, import the trace
      const replaying = await openDemo(url);
      await replayTraceInstantly(replaying.panel, trace);
      await expect(replaying.app.getByTestId('user')).toHaveText(userText!);
      await expect(replaying.app.getByTestId('email')).toHaveValue('bob@example.com');
    });
  });

test('a trace recorded in React replays in Vue (same sids from the shared model)', async ({
  openDemo,
}) => {
  const react = await openDemo(demoUrl('react'));
  await clickTimes(react.app.getByTestId('inc'), 2);
  await react.app.getByTestId('email').fill('cross@example.com');
  const trace = await exportTrace(react.panel);

  const vue = await openDemo(demoUrl('vue'));
  await replayTraceInstantly(vue.panel, trace);
  await expect(vue.app.getByTestId('count')).toHaveText('2');
  await expect(vue.app.getByTestId('email')).toHaveValue('cross@example.com');
});
