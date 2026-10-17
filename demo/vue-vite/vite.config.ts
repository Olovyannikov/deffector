import { defaultClientConditions, defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    // this monorepo's agent from its TypeScript sources (an installed @deffector/agent uses dist/)
    conditions: ['@deffector/source', ...defaultClientConditions],
    dedupe: ['effector', 'effector-vue', 'vue'],
  },
});
