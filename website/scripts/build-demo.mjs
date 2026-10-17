// Builds the React demo (demo/react-vite) into website/public/demo, so the documentation site serves
// a live page to try the extension on. The agent must be in this build, so it is a development build:
// a production one would resolve @deffector/agent to its no-op.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';

const websiteDirectory = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.DOCS_BASE || '/deffector/';

process.env.NODE_ENV = 'development';
await build({
  root: join(websiteDirectory, '../demo/react-vite'),
  base: `${base}demo/`,
  mode: 'development',
  logLevel: 'warn',
  build: {
    outDir: join(websiteDirectory, 'public/demo'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
  },
});
