/** Ports of the demo apps (see each demo's `dev` script); playwright.config.ts starts them all. */
export const DEMO_PORTS = {
  react: 5171,
  vue: 5172,
  solid: 5173,
  globalMode: 5174,
  noPlugin: 5175,
  nodeSsr: 5176,
  next: 5177,
  lab: 5178,
} as const;

/** The standalone deffector app: the panel for Node SSR and the Next.js server. */
export const STANDALONE_PORT = 8686;

export type DemoName = keyof typeof DEMO_PORTS;

export const demoUrl = (demo: DemoName) => `http://localhost:${DEMO_PORTS[demo]}/`;

export const STANDALONE_URL = `http://localhost:${STANDALONE_PORT}/`;
