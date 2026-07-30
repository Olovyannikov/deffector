/**
 * The agent runs in browsers, Node (SSR, tests) and React Native. These helpers
 * read optional globals only when they exist.
 */

/** High-resolution time where `performance` exists, wall-clock time elsewhere. */
export function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** In Node a pending timer keeps the process alive; the agent's timers must not. */
export function unrefTimer(timer: unknown): void {
  (timer as { unref?: () => void } | null | undefined)?.unref?.();
}

export function canSetTimers(): boolean {
  return typeof setTimeout !== 'undefined';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** The page location; there is none in Node, React Native and workers without a document. */
export function pageLocation(): Location | undefined {
  return typeof globalThis.location !== 'undefined' ? globalThis.location : undefined;
}

export function pageUrl(): string | undefined {
  return pageLocation()?.href;
}
