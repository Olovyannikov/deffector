import {
  test as base,
  chromium,
  expect,
  type BrowserContext,
  type Page,
  type Worker,
} from '@playwright/test';
import { resolve } from 'node:path';

const EXTENSION_PATH = resolve(__dirname, '../packages/extension/dist');

/** What the extension's service worker reports for each page with a live agent. */
interface AgentTab {
  tabId: number;
  url: string;
}

interface DemoPages {
  app: Page;
  panel: Page;
}

interface Fixtures {
  /** a Chromium profile with the built extension loaded */
  context: BrowserContext;
  /** the extension's service worker */
  worker: Worker;
  extensionId: string;
  /** opens the panel for `app` in its own tab; `query` is appended to the panel URL */
  openPanel: (app: Page, query?: string) => Promise<Page>;
  /** opens a demo and its panel, and waits until the panel is connected */
  openDemo: (url: string, panelQuery?: string) => Promise<DemoPages>;
}

/** Resolves when the panel's toolbar shows the effector version the agent reported. */
export async function waitForConnection(panel: Page, statusText = 'effector') {
  await expect(panel.locator('.tb-status')).toContainText(statusText);
}

async function findNewestTabId(worker: Worker, url: string): Promise<number | undefined> {
  return worker.evaluate((pageUrl) => {
    const { __deffectorTabs: listAgentTabs } = globalThis as unknown as {
      __deffectorTabs: () => AgentTab[];
    };
    const tabIds = listAgentTabs()
      .filter((tab) => tab.url === pageUrl)
      .map((tab) => tab.tabId);
    return tabIds.length ? Math.max(...tabIds) : undefined;
  }, url);
}

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright reads fixture dependencies from this destructuring
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
      viewport: { width: 1280, height: 800 },
    });
    await use(context);
    await context.close();
  },

  worker: async ({ context }, use) => {
    const [running] = context.serviceWorkers();
    await use(running ?? (await context.waitForEvent('serviceworker')));
  },

  extensionId: async ({ worker }, use) => {
    // chrome-extension://<id>/background.js
    await use(new URL(worker.url()).host);
  },

  openPanel: async ({ context, worker, extensionId }, use) => {
    await use(async (app, query = '') => {
      // the agent registers its tab with the extension shortly after the page loads;
      // tests open several copies of a demo, the newest tab is the one just opened
      let tabId: number | undefined;
      await expect
        .poll(
          async () => {
            tabId = await findNewestTabId(worker, app.url());
            return tabId;
          },
          { message: `tab not found for ${app.url()}` },
        )
        .toBeDefined();
      const panel = await context.newPage();
      await panel.goto(
        `chrome-extension://${extensionId}/panel.html?tabId=${tabId}&lang=en${query}`,
      );
      return panel;
    });
  },

  openDemo: async ({ context, openPanel }, use) => {
    await use(async (url, panelQuery) => {
      const app = await context.newPage();
      await app.goto(url);
      const panel = await openPanel(app, panelQuery);
      await waitForConnection(panel);
      return { app, panel };
    });
  },
});

export { expect };
