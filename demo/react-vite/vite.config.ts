import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // one copy of effector for the app, the shared model and the agent
  resolve: { dedupe: ['effector', 'effector-react', 'react', 'react-dom'] },
});
