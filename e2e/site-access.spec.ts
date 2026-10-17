import { test, expect } from './fixtures';
import { demoUrl } from './demos';

// The extension runs on localhost by itself; any other address needs the user's permission.
// The React demo is served under a non-local name by forwarding its requests to the dev server.
const REMOTE_ORIGIN = 'http://deffector-demo.test';
const LOCAL_ORIGIN = demoUrl('react').replace(/\/$/, '');

test('a site outside localhost: the panel offers to allow it and opens the request window', async ({
  context,
  worker,
  extensionId,
}) => {
  await context.route(`${REMOTE_ORIGIN}/**`, async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace(REMOTE_ORIGIN, LOCAL_ORIGIN),
    });
    await route.fulfill({ response });
  });
  const app = await context.newPage();
  await app.goto(`${REMOTE_ORIGIN}/`);
  await expect(app.getByTestId('inc')).toBeVisible();

  // no content script on this origin, so no agent reaches the extension
  const agentUrls = await worker.evaluate(() =>
    (globalThis as unknown as { __deffectorTabs: () => { url: string }[] })
      .__deffectorTabs()
      .map((tab) => tab.url),
  );
  expect(agentUrls).not.toContain(`${REMOTE_ORIGIN}/`);

  // the newest tab is the app; inside DevTools the panel reads the origin itself
  const tabId = await worker.evaluate(async () => {
    const tabs = await chrome.tabs.query({});
    return Math.max(...tabs.map((tab) => tab.id ?? 0));
  });
  const panel = await context.newPage();
  await panel.goto(
    `chrome-extension://${extensionId}/panel.html?tabId=${tabId}&lang=en&origin=${encodeURIComponent(REMOTE_ORIGIN)}`,
  );
  await expect(panel.getByText('deffector has no access to deffector-demo.test')).toBeVisible();

  const requestWindow = context.waitForEvent('page');
  await panel.getByRole('button', { name: 'Allow on this site' }).click();
  const grantPage = await requestWindow;
  await expect(grantPage).toHaveURL(/\/grant\.html\?origin=/);
  await expect(grantPage.getByText('Allow deffector on this site?')).toBeVisible();
  await expect(grantPage.getByText('deffector-demo.test')).toBeVisible();
});

test('localhost needs no permission: the panel waits for the agent as before', async ({
  context,
  extensionId,
}) => {
  const panel = await context.newPage();
  await panel.goto(
    `chrome-extension://${extensionId}/panel.html?tabId=999999&lang=en&origin=${encodeURIComponent(LOCAL_ORIGIN)}`,
  );
  await expect(panel.getByText('Waiting for the deffector agent')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Allow on this site' })).toHaveCount(0);
});
