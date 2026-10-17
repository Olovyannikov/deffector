import { defaultClientConditions, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022' },
  esbuild: { target: 'es2022' },
  resolve: {
    // this monorepo's agent from its TypeScript sources (an installed @deffector/agent uses dist/)
    conditions: ['@deffector/source', ...defaultClientConditions],
    // one copy of effector for the app, the shared model and the agent
    dedupe: ['effector', 'effector-react', 'react', 'react-dom'],
  },
});
