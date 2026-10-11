/** What the lab exposes on `window.__lab` for the e2e perf test and for the console. */
export interface LabTestHandle {
  /** build and first-kick times in ms, keyed like `build1100` / `kick1100` */
  stats: Record<string, number>;
  /** kicks the last built big graph again with a new value */
  kick?: () => Promise<unknown>;
}

declare global {
  interface Window {
    __lab: LabTestHandle;
  }
}

window.__lab = { stats: {} };

export const labTestHandle = window.__lab;
