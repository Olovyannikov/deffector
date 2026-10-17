import { defaultClientConditions, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // this monorepo's agent from its TypeScript sources (an installed @deffector/agent uses dist/)
    conditions: ['@deffector/source', ...defaultClientConditions],
    dedupe: ['effector', 'effector-react', 'react', 'react-dom'],
    // the same model, compiled without the effector babel plugin: no sids, no names, no locations
    alias: [{ find: /^@deffector-demo\/shared$/, replacement: '@deffector-demo/shared/raw' }],
  },
});
