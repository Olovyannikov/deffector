import type { Step } from '@deffector/protocol';

/** Nesting depth of every step by its index: the root is 0, a step pushed by it is 1, and so on. */
export function stepDepths(steps: readonly Step[]): Map<number, number> {
  const depths = new Map<number, number>();
  for (const step of steps)
    depths.set(step.i, step.parent === null ? 0 : (depths.get(step.parent) ?? 0) + 1);
  return depths;
}
