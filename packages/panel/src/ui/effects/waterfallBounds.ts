import type { EffectCall } from './effectCalls';

/** A pending call's bar grows a little past the newest transaction. */
const PENDING_TAIL_MS = 200;

export interface WaterfallBounds {
  /** where a pending call's bar ends */
  now: number;
  start: number;
  /** ms the waterfall covers, at least 1 */
  span: number;
}

export function waterfallBounds(calls: readonly EffectCall[], latestTime: number): WaterfallBounds {
  const hasPending = calls.some((call) => call.endedAt === null);
  const now =
    Math.max(latestTime, ...calls.map((call) => call.endedAt ?? call.startedAt)) +
    (hasPending ? PENDING_TAIL_MS : 0);
  const start = Math.min(...calls.map((call) => call.startedAt));
  const end = Math.max(...calls.map((call) => call.endedAt ?? now));
  return { now, start, span: Math.max(1, end - start) };
}
