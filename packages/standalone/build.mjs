import * as esbuild from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = dirname(fileURLToPath(import.meta.url));
// server.mjs serves this directory
const outputDirectory = join(packageDirectory, 'dist/public');
mkdirSync(outputDirectory, { recursive: true });
cpSync(join(packageDirectory, 'src/index.html'), join(outputDirectory, 'index.html'));
cpSync(join(packageDirectory, '../panel/src/panel.css'), join(outputDirectory, 'panel.css'));
await esbuild.build({
  entryPoints: { app: join(packageDirectory, 'src/app.tsx') },
  outdir: outputDirectory,
  bundle: true,
  format: 'iife',
  target: 'es2022',
  jsx: 'automatic',
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
});
