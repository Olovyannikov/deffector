import { defaultClientConditions, defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  resolve: {
    // this monorepo's agent from its TypeScript sources (an installed @deffector/agent uses dist/)
    conditions: ['@deffector/source', ...defaultClientConditions],
    dedupe: ['effector', 'effector-solid', 'solid-js'],
  },
});
