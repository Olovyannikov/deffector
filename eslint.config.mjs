// ESLint: Airbnb rules (eslint-config-airbnb-extended, ESLint 9 flat config) for TypeScript and React.
// Formatting belongs to Prettier (.prettierrc.json); eslint-config-prettier turns off the rules it owns.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import js from '@eslint/js';
import { configs, plugins } from 'eslint-config-airbnb-extended';
import prettierConfig from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

const rootDir = import.meta.dirname;
const { workspaces } = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));

const typeScriptProjects = [
  './tsconfig.json',
  './tsconfig.solid.json',
  './demo/next-ssr/tsconfig.json',
];

const solidFiles = ['packages/agent/src/adapters/solid*.tsx', 'demo/solid-vite/src/**/*.tsx'];
const vueFiles = ['demo/vue-vite/**/*.vue'];

// Files that run in Node (or in Playwright/Vitest) and may use devDependencies
const toolingFiles = [
  '**/*.mjs',
  '**/*.config.ts',
  'packages/*/test/**',
  'e2e/**',
  'demo/next-ssr/instrumentation.ts',
  'website/.vitepress/**',
  'website/scripts/**',
];

export default defineConfig([
  {
    name: 'deffector/ignores',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/dist-raw/**',
      '**/dist-firefox/**',
      '**/.next/**',
      'test-results/**',
      'playwright-report/**',
      'demo/next-ssr/next-env.d.ts',
      'website/public/demo/**',
    ],
  },

  // Airbnb: JavaScript
  { name: 'js/recommended', ...js.configs.recommended },
  plugins.stylistic,
  plugins.importX,
  ...configs.base.recommended,

  // Airbnb: React
  plugins.react,
  plugins.reactHooks,
  plugins.reactA11y,
  ...configs.react.recommended,

  // Airbnb: TypeScript
  plugins.typescriptEslint,
  ...configs.base.typescript,
  ...configs.react.typescript,

  {
    name: 'deffector/typescript-projects',
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: typeScriptProjects,
        tsconfigRootDir: rootDir,
      },
    },
  },
  {
    name: 'deffector/javascript-files',
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },

  {
    name: 'deffector/globals',
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.webextensions },
    },
    rules: {
      // dependencies are declared per workspace; tooling comes from the root package.json
      'import-x/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: toolingFiles,
          packageDir: [rootDir, ...workspaces.map((workspace) => join(rootDir, workspace))],
        },
      ],
    },
  },
  {
    name: 'deffector/tooling-files',
    files: toolingFiles,
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-console': 'off',
      // test and script steps run one after another on purpose (a browser page, a server)
      'no-await-in-loop': 'off',
    },
  },
  {
    // Node needs the extension to import an ES module file
    name: 'deffector/node-esm-imports',
    files: ['**/*.mjs'],
    rules: {
      'import-x/extensions': ['error', 'ignorePackages', { mjs: 'always', js: 'always' }],
    },
  },
  {
    // Playwright fixtures receive a `use` callback that is not a React hook
    name: 'deffector/e2e',
    files: ['e2e/**'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },

  // Vue single-file components of demo/vue-vite: Airbnb has no Vue rules, eslint-plugin-vue adds them
  ...vue.configs['flat/recommended'].map((config) => ({ ...config, files: vueFiles })),
  {
    name: 'deffector/vue',
    files: vueFiles,
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
        project: false,
        projectService: false,
        program: null,
      },
    },
  },

  // Deliberate departures from Airbnb, each with its reason
  {
    name: 'deffector/airbnb-exceptions',
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    rules: {
      // for...of reads better than forEach with early exits, and the agent's hot loops
      // (the collector runs for every effector kernel step) must not allocate closures.
      // The rest of Airbnb's list stays.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForInStatement',
          message: 'Use Object.keys/values/entries with for...of instead of for...in.',
        },
        { selector: 'LabeledStatement', message: 'Labels are a form of GOTO.' },
        { selector: 'WithStatement', message: '`with` is disallowed in strict mode.' },
      ],
      // `continue` keeps guard clauses flat inside loops
      'no-continue': 'off',
      // `i++` only as a for-loop afterthought
      'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
      // named exports: one import style across the repository, easy to search and rename
      'import-x/prefer-default-export': 'off',
      // `void promise` marks a promise that is deliberately not awaited
      'no-void': ['error', { allowAsStatement: true }],
      // window handles for tests and debugging, and a marker the agent puts on effector nodes
      'no-underscore-dangle': [
        'error',
        {
          allow: [
            '__deffectorTabs',
            '__deffectorPanel',
            '__deffectorDisposed',
            '__lab',
            '__labScope',
          ],
          allowAfterThis: false,
        },
      ],
      // the agent records into mutable objects and patches effector nodes and scopes by design;
      // parameters with these names may be modified, any other parameter may not
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: ['transaction', 'node', 'scope', 'port', 'connection'],
        },
      ],
      // React 19 ignores defaultProps on function components: optional props get default arguments
      'react/require-default-props': [
        'error',
        { forbidDefaultForRequired: true, functions: 'defaultArguments' },
      ],
      // the automatic JSX runtime (React 17+) does not need React in scope
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
    },
  },

  // Solid overrides come after the exceptions above, so they win for Solid files
  // Solid uses its own JSX: `class`, signals called as functions, no hooks
  {
    name: 'deffector/solid',
    files: solidFiles,
    settings: {
      // Solid labels use `for`, not `htmlFor`
      'jsx-a11y': { attributes: { for: ['htmlFor', 'for'] } },
    },
    rules: {
      // Solid props are reactive getters: destructuring would read them once
      'react/destructuring-assignment': 'off',
      // ...so optional props cannot get default arguments either
      'react/require-default-props': 'off',
      'react/no-unknown-property': 'off',
      'react/jsx-key': 'off',
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
    },
  },

  // Must stay last: turns off the formatting rules Prettier owns
  { name: 'prettier/config', ...prettierConfig },
]);
