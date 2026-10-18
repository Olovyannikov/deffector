// Publishable build of @deffector/agent into dist/: ESM JavaScript with bundled type declarations.
// @deffector/protocol is not published on its own: its code and types are inlined here.
// effector and the UI frameworks stay external, so the app and the agent share one effector.
import { defineConfig } from 'tsup';

const external = [
  /^effector($|\/)/,
  /^effector-(react|vue|solid)($|\/)/,
  /^react($|\/)/,
  /^vue($|\/)/,
  /^solid-js($|\/)/,
  /^@deffector\/agent($|\/)/,
];

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      noop: 'src/noop.ts',
      node: 'src/node.ts',
      'node-noop': 'src/node-noop.ts',
      react: 'src/adapters/react.tsx',
      'react-noop': 'src/adapters/react-noop.tsx',
      'react-scope': 'src/adapters/react-scope.ts',
      'react-scope-noop': 'src/adapters/react-scope-noop.ts',
      vue: 'src/adapters/vue.ts',
      'vue-noop': 'src/adapters/vue-noop.ts',
    },
    format: ['esm'],
    platform: 'neutral',
    target: 'es2020',
    // the entries share one chunk, so `@deffector/agent` and `@deffector/agent/react` are one agent
    splitting: true,
    tsconfig: 'tsconfig.build.json',
    dts: { resolve: ['@deffector/protocol'] },
    noExternal: ['@deffector/protocol'],
    external,
  },
  {
    // Solid ships as source (the `solid` export condition, compiled by vite-plugin-solid or
    // babel-preset-solid in the app); only its declarations are built here
    entry: {
      solid: 'src/adapters/solid.tsx',
      'solid-noop': 'src/adapters/solid-noop.tsx',
      'solid-scope': 'src/adapters/solid-scope.tsx',
      'solid-scope-noop': 'src/adapters/solid-scope-noop.tsx',
    },
    format: ['esm'],
    tsconfig: 'tsconfig.solid-build.json',
    dts: { only: true },
    external,
  },
]);
