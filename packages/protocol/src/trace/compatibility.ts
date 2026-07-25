import type { UnitInfo } from '../messages';
import type { TraceFile, TraceUnit } from './traceFile';

export type CompatLevel = 'ok' | 'warning' | 'error' | 'info';

export interface CompatRow {
  level: CompatLevel;
  text: string;
  unit?: string;
}

export interface CompatReport {
  ok: boolean;
  title: string;
  rows: CompatRow[];
  /** TraceUnit.ref → current unit id */
  mapping: Record<string, string>;
  skippedSteps: number[];
  canReplay: boolean;
}

/** How many masked paths and lossy values the report lists before cutting the list. */
const REDACTED_SHOWN = 6;
const LOSSY_SHOWN = 4;

interface UnitIndex {
  bySid: Map<string, UnitInfo>;
  /** `kind:name` → units */
  byKindAndName: Map<string, UnitInfo[]>;
}

/** Only real units are indexed: a trace calls stores, events and effects, not operator nodes. */
function indexUnits(units: UnitInfo[]): UnitIndex {
  const bySid = new Map<string, UnitInfo>();
  const byKindAndName = new Map<string, UnitInfo[]>();
  for (const unit of units) {
    if (!unit.isUnit) continue;
    if (unit.sid) bySid.set(unit.sid, unit);
    const key = `${unit.kind}:${unit.name}`;
    const sameName = byKindAndName.get(key) || [];
    sameName.push(unit);
    byKindAndName.set(key, sameName);
  }
  return { bySid, byKindAndName };
}

/** File paths differ between machines and builds: one may be a suffix of the other. */
function isSameFile(traceFile: string | undefined, currentFile: string | undefined): boolean {
  return (
    !traceFile ||
    !currentFile ||
    currentFile === traceFile ||
    currentFile.endsWith(traceFile) ||
    traceFile.endsWith(currentFile)
  );
}

interface UnitMatch {
  /** current unit id, null when the unit is not in this build */
  unitId: string | null;
  /** what the user should know about the match; null for an exact match by sid */
  problem: CompatRow | null;
}

function matchTraceUnit(traceUnit: TraceUnit, index: UnitIndex): UnitMatch {
  const bySid = traceUnit.sid ? index.bySid.get(traceUnit.sid) : undefined;
  if (bySid && bySid.kind === traceUnit.kind) return { unitId: bySid.id, problem: null };

  const sameName = index.byKindAndName.get(`${traceUnit.kind}:${traceUnit.name}`) || [];
  const candidates = sameName.filter((unit) => isSameFile(traceUnit.file, unit.file));
  const { name } = traceUnit;
  if (candidates.length === 1) {
    return {
      unitId: candidates[0].id,
      problem: {
        level: 'warning',
        unit: name,
        text: `${name}: sid ${traceUnit.sid ?? '—'} → ${candidates[0].sid ?? '—'}, matched by name and file`,
      },
    };
  }
  if (candidates.length > 1) {
    return {
      unitId: candidates[0].id,
      problem: {
        level: 'warning',
        unit: name,
        text: `${name}: ${candidates.length} units with this name, the first one is used`,
      },
    };
  }
  return {
    unitId: null,
    problem: {
      level: 'error',
      unit: name,
      text: `${name} (${traceUnit.kind}) is not in the current build`,
    },
  };
}

/** Rows about the trace as a whole: skipped steps, other build or effector, masking, notes. */
function describeTrace(
  trace: TraceFile,
  currentMeta: { effector: string; build?: string },
  skippedStepCount: number,
): CompatRow[] {
  const rows: CompatRow[] = [];
  const { meta, redacted, lossy, notes } = trace;
  if (skippedStepCount) {
    rows.push({
      level: 'warning',
      text: `${skippedStepCount} step(s) call units missing in this build and will be skipped`,
    });
  }
  if (meta.build && currentMeta.build && meta.build !== currentMeta.build) {
    rows.push({
      level: 'warning',
      text: `Recorded on build ${meta.build}, running ${currentMeta.build}: sids may have moved with the code`,
    });
  }
  if (meta.effector !== currentMeta.effector) {
    rows.push({
      level: 'info',
      text: `Recorded with effector ${meta.effector}, running ${currentMeta.effector}`,
    });
  }
  if (redacted.length) {
    const shown = redacted.slice(0, REDACTED_SHOWN).join(', ');
    const ellipsis = redacted.length > REDACTED_SHOWN ? '…' : '';
    rows.push({
      level: 'info',
      text: `Masked before export: ${shown}${ellipsis} (string length kept)`,
    });
  }
  if (lossy.length) {
    rows.push({
      level: 'warning',
      text: `${lossy.length} value(s) can't be restored exactly: ${lossy.slice(0, LOSSY_SHOWN).join(', ')}`,
    });
  }
  if (notes.length) {
    rows.push({
      level: 'info',
      text: `${notes.length} note(s) from ${meta.author || 'the author'}`,
    });
  }
  return rows;
}

/**
 * Match trace units to the units of the running app.
 * By sid first; if the sid moved (code edited, other build), by name + file + kind.
 */
export function checkCompat(
  trace: TraceFile,
  current: UnitInfo[],
  currentMeta: { effector: string; build?: string },
): CompatReport {
  const index = indexUnits(current);
  const mapping: Record<string, string> = {};
  const unitRows: CompatRow[] = [];
  const missingRefs: string[] = [];
  let matchedBySid = 0;
  for (const traceUnit of trace.units) {
    const { unitId, problem } = matchTraceUnit(traceUnit, index);
    if (unitId === null) missingRefs.push(traceUnit.ref);
    else mapping[traceUnit.ref] = unitId;
    if (problem) unitRows.push(problem);
    else matchedBySid += 1;
  }

  const skippedSteps = trace.steps.filter((step) => !mapping[step.unit]).map((step) => step.n);
  const calledRefs = new Set(trace.steps.map((step) => step.unit));
  const { author } = trace.meta;
  return {
    ok: !missingRefs.some((ref) => calledRefs.has(ref)),
    title: `${trace.steps.length} steps, ${trace.effectResults.length} effect results${author ? ` · ${author}` : ''}`,
    rows: [
      { level: 'ok', text: `${matchedBySid} of ${trace.units.length} units matched by sid` },
      ...unitRows,
      ...describeTrace(trace, currentMeta, skippedSteps.length),
    ],
    mapping,
    skippedSteps,
    canReplay: trace.steps.length > 0 && trace.steps.length > skippedSteps.length,
  };
}
