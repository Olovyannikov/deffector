// Renders the extension icons from the brand SVGs in assets/brand into static/icons.
// The PNGs are committed; run this only after the logo changes:
//   node packages/extension/scripts/render-icons.mjs
// Small sizes use the simplified favicon mark, which stays readable at 16–32 px.
// `-off` variants (toolbar icon while the tab has no agent) are greyed out.
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const brandDirectory = join(scriptDirectory, '../../../assets/brand');
const outputDirectory = join(scriptDirectory, '../static/icons');

const ICONS = [
  { size: 16, source: 'favicon.svg' },
  { size: 32, source: 'favicon.svg' },
  { size: 48, source: 'logo.svg' },
  { size: 128, source: 'logo.svg' },
];

const VARIANTS = [
  { suffix: '', filter: 'none' },
  { suffix: '-off', filter: 'grayscale(1) opacity(0.55)' },
];

const toDataUrl = (fileName) =>
  `data:image/svg+xml;base64,${readFileSync(join(brandDirectory, fileName)).toString('base64')}`;

mkdirSync(outputDirectory, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();

for (const { size, source } of ICONS) {
  for (const { suffix, filter } of VARIANTS) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<body style="margin:0"><img src="${toDataUrl(source)}" width="${size}" height="${size}" style="display:block;filter:${filter}"></body>`,
    );
    await page.locator('img').evaluate((image) => image.decode());
    await page
      .locator('img')
      .screenshot({ path: join(outputDirectory, `${size}${suffix}.png`), omitBackground: true });
  }
}

await browser.close();
