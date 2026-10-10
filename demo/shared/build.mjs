// Compiles src/*.ts twice:
//  dist/      with the effector babel plugin (sids, names, source locations, factories)
//  dist-raw/  without it: what an app without the plugin looks like (demo/no-plugin)
import { transformFileAsync } from '@babel/core';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = dirname(fileURLToPath(import.meta.url));
const sourceDir = join(packageDir, 'src');

const effectorPlugin = [
  'effector/babel-plugin',
  { addLoc: true, addNames: true, factories: ['./src/field'] },
];

// Node ESM needs extensions in relative imports; bundlers do not care
const addJsExtensions = (code) =>
  code.replace(/from '(\.\.?\/[^']+?)'/g, (_, path) => `from '${path}.js'`);

async function build(outDirName, withPlugin) {
  const outDir = join(packageDir, outDirName);
  mkdirSync(outDir, { recursive: true });
  const sourceFiles = readdirSync(sourceDir).filter((file) => file.endsWith('.ts'));
  for (const file of sourceFiles) {
    const result = await transformFileAsync(join(sourceDir, file), {
      babelrc: false,
      configFile: false,
      cwd: packageDir,
      root: packageDir,
      sourceMaps: 'inline',
      presets: [['@babel/preset-typescript', { rewriteImportExtensions: true }]],
      plugins: withPlugin ? [effectorPlugin] : [],
    });
    writeFileSync(join(outDir, file.replace(/\.ts$/, '.js')), addJsExtensions(result.code));
  }
  console.log('demo/shared built →', outDir);
}

await build('dist', true);
await build('dist-raw', false);
