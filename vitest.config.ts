import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@deffector/protocol': r('./packages/protocol/src/index.ts'),
      // before '@deffector/agent': aliases match by prefix, the first one wins
      '@deffector/agent/node': r('./packages/agent/src/node.ts'),
      '@deffector/agent': r('./packages/agent/src/index.ts'),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    environment: 'node',
  },
});
