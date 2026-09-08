// ESM build into dist/ for runtimes that cannot load TypeScript sources
// (Node SSR, Next.js server bundles, plain <script type=module>). effector and
// frameworks stay external, so the app and the agent share one effector.
import * as esbuild from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const entries = {
  index: 'src/index.ts',
  noop: 'src/noop.ts',
  node: 'src/node.ts',
  'node-noop': 'src/node-noop.ts',
  react: 'src/adapters/react.tsx',
  'react-noop': 'src/adapters/react-noop.tsx',
  vue: 'src/adapters/vue.ts',
  'vue-noop': 'src/adapters/vue-noop.ts',
};
await esbuild.build({
  entryPoints: Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, join(here, v)])),
  outdir: join(here, 'dist'),
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2020',
  jsx: 'automatic',
  external: [
    'effector',
    'effector/*',
    'effector-react',
    'effector-vue',
    'effector-vue/*',
    'effector-solid',
    'react',
    'react/*',
    'vue',
    'solid-js',
    'solid-js/*',
  ],
  logLevel: 'info',
});
// solid needs its own JSX transform: ship the source for vite-plugin-solid / babel-preset-solid
