import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['effector', 'effector-vue', 'vue'] },
});
