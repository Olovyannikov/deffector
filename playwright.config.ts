import { defineConfig } from '@playwright/test';
import { DEMO_PORTS, STANDALONE_PORT } from './e2e/demos';

interface WebServer {
  command: string;
  url: string;
  timeout: number;
  reuseExistingServer: boolean;
}

/** A server the tests need; one that is already running (npm run dev:*) is reused. */
const server = (command: string, url: string, timeout: number): WebServer => ({
  command,
  url,
  timeout,
  reuseExistingServer: true,
});

/** A Vite demo; --strictPort fails instead of moving to another port the tests do not know. */
const viteDemo = (workspace: string, port: number) =>
  server(
    `npm run dev -w @deffector-demo/${workspace} -- --strictPort`,
    `http://localhost:${port}`,
    60_000,
  );

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  webServer: [
    viteDemo('react-vite', DEMO_PORTS.react),
    viteDemo('vue-vite', DEMO_PORTS.vue),
    viteDemo('solid-vite', DEMO_PORTS.solid),
    viteDemo('global-mode', DEMO_PORTS.globalMode),
    viteDemo('no-plugin', DEMO_PORTS.noPlugin),
    viteDemo('lab', DEMO_PORTS.lab),
    // next dev compiles the page on the first request
    server(
      'npm run dev -w @deffector-demo/next-ssr',
      `http://localhost:${DEMO_PORTS.next}`,
      120_000,
    ),
    server(
      `node packages/standalone/bin/deffector.mjs --port ${STANDALONE_PORT}`,
      `http://localhost:${STANDALONE_PORT}/targets.json`,
      30_000,
    ),
    server(
      'npm start -w @deffector-demo/node-ssr',
      `http://localhost:${DEMO_PORTS.nodeSsr}`,
      30_000,
    ),
  ],
});
