import { test, expect } from '@playwright/test';
import { demoUrl, STANDALONE_URL } from './demos';
import { exportTrace, panelRows } from './helpers';

const NODE_SSR = demoUrl('nodeSsr');

test('standalone app shows the scopes of a Node SSR server', async ({ page, request }) => {
  await page.goto(`${STANDALONE_URL}?lang=en&theme=dark`);
  // other agents (the Next.js server) may be connected too: pick the node-ssr one
  const targetSelect = page.locator('#target');
  const nodeSsrTarget = targetSelect.locator('option', { hasText: 'node-ssr demo' });
  await expect(nodeSsrTarget).toBeAttached();
  await targetSelect.selectOption(await nodeSsrTarget.getAttribute('value'));
  await expect(page.locator('.tb-status')).toContainText('effector 23.4.4', { timeout: 15_000 });
  await request.get(`${NODE_SSR}?email=taken@example.com&name=Eve`);
  await request.get(`${NODE_SSR}inc`);
  // every request is its own scope
  const scopes = page.locator('.tb select.inp option');
  await expect(scopes.filter({ hasText: /request #\d+ \/\?email=taken/ }).first()).toBeAttached();
  await expect(scopes.filter({ hasText: /^server/ })).toHaveCount(1);
  await expect(panelRows(page, 'signupFx').filter({ hasText: 'fail' }).first()).toBeVisible();
  // the password typed on the server never leaves it unmasked in a trace
  const trace = await exportTrace(page);
  expect(JSON.stringify(trace)).not.toContain('server-side-secret');
});
