// Builds the extension:
//   node build.mjs                    → dist/          (Chrome, Edge: chrome://extensions → "Load unpacked")
//   node build.mjs --target=firefox   → dist-firefox/  (about:debugging → "Load Temporary Add-on" → manifest.json)
//   --watch rebuilds on change
import * as esbuild from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');
const targetArgument = process.argv.find((argument) => argument.startsWith('--target='));
const isFirefox = targetArgument?.split('=')[1] === 'firefox';
const outputDirectory = join(packageDirectory, isFirefox ? 'dist-firefox' : 'dist');
/** One script per extension page or context, bundled from src/<name>.ts to <name>.js. */
const ENTRY_NAMES = ['background', 'content', 'devtools', 'panel', 'popup'];

rmSync(outputDirectory, { recursive: true, force: true });
mkdirSync(outputDirectory, { recursive: true });
cpSync(join(packageDirectory, 'static'), outputDirectory, { recursive: true });
cpSync(join(packageDirectory, '../panel/src/panel.css'), join(outputDirectory, 'panel.css'));

if (isFirefox) {
  // Firefox MV3: background scripts instead of a service worker, a gecko id (140+ for
  // data_collection_permissions), no Chrome-only keys
  const manifestPath = join(outputDirectory, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  delete manifest.minimum_chrome_version;
  manifest.background = { scripts: ['background.js'] };
  manifest.browser_specific_settings = {
    gecko: {
      id: 'deffector@deffector.dev',
      strict_min_version: '140.0',
      data_collection_permissions: { required: ['none'] },
    },
    // Firefox for Android reads data_collection_permissions from 142
    gecko_android: { strict_min_version: '142.0' },
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

const options = {
  entryPoints: ENTRY_NAMES.map((name) => ({
    in: join(packageDirectory, 'src', `${name}.ts`),
    out: name,
  })),
  outdir: outputDirectory,
  bundle: true,
  format: 'iife',
  target: isFirefox ? 'firefox140' : 'chrome116',
  jsx: 'automatic',
  sourcemap: isWatch ? 'inline' : false,
  minify: !isWatch,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': isWatch ? '"development"' : '"production"' },
  logLevel: 'info',
};

if (isWatch) {
  const context = await esbuild.context(options);
  await context.watch();
} else {
  await esbuild.build(options);
}
