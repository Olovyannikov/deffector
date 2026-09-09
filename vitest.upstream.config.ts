// Runs the agent tests against an effector build with the upstream changes
// (the proposed effector PRs): EFFECTOR_DIST=/path/to/effector/npm/effector npx vitest run -c vitest.upstream.config.ts
import { resolve } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config';

const dist = process.env.EFFECTOR_DIST;
if (!dist) throw new Error('set EFFECTOR_DIST to the npm/effector folder of an effector build');

export default mergeConfig(
  base,
  defineConfig({
    resolve: {
      alias: [
        { find: /^effector$/, replacement: resolve(dist, 'effector.mjs') },
        { find: /^effector\/inspect$/, replacement: resolve(dist, 'inspect.mjs') },
      ],
    },
  }),
);
