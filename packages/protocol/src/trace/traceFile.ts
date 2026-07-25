import type { Encoded } from '../encoding';

export const TRACE_FORMAT = 'deffector-trace@1';

export interface TraceUnit {
  /** id at recording time, only meaningful inside this file */
  ref: string;
  name: string;
  kind: string;
  sid: string | null;
  file?: string;
  derived?: boolean;
}

export interface TraceStep {
  /** transaction number in the recorded session */
  n: number;
  /** ms since the first step */
  t: number;
  /** TraceUnit.ref of the unit that was called */
  unit: string;
  scope: 'scope' | 'global';
  params: Encoded;
  /** devtools actions are recorded too, so edits replay as well */
  devtools?: 'edit' | 'preset' | 'revert';
  /** for devtools edits: unit ref → value */
  values?: Record<string, Encoded>;
}

export interface TraceEffectResult {
  unit: string;
  /** 1-based call number of this effect within the trace */
  call: number;
  status: 'done' | 'fail';
  value: Encoded;
  ms: number | null;
}

export interface TraceNote {
  step: number;
  text: string;
  author?: string;
}

export interface TraceFile {
  format: typeof TRACE_FORMAT;
  meta: {
    app: string;
    url: string;
    build?: string;
    effector: string;
    agent: string;
    recordedAt: string;
    author?: string;
    scope: { name: string; kind: 'scope' | 'global' };
    userAgent?: string;
    /** step to open after replay (`#step=142`) */
    focus?: number;
  };
  units: TraceUnit[];
  /** writable store values before the first step: unit ref → value */
  initial: Record<string, Encoded>;
  steps: TraceStep[];
  effectResults: TraceEffectResult[];
  notes: TraceNote[];
  /** paths that were masked before export */
  redacted: string[];
  /** values that can't be restored exactly (functions, DOM nodes, class instances) */
  lossy: string[];
}

/** A shallow check of an imported file: the format marker and the arrays replay walks. */
export function isTraceFile(candidate: unknown): candidate is TraceFile {
  if (!candidate || typeof candidate !== 'object') return false;
  const file = candidate as Partial<Record<keyof TraceFile, unknown>>;
  return file.format === TRACE_FORMAT && Array.isArray(file.steps) && Array.isArray(file.units);
}
