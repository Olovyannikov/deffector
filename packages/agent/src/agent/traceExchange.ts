import { checkCompat, isTraceFile, type CompatReport, type TraceFile } from '@deffector/protocol';
import { effectorVersion } from '../effector';
import type { History } from '../history';
import type { Registry } from '../registry';
import type { Scopes } from '../scopes';
import { exportTrace, type TraceExportContext } from '../trace';
import { AGENT_VERSION, type AppInfo } from './options';
import type { StoreValues } from './storeValues';

export interface TraceExchangeParts {
  registry: Registry;
  scopes: Scopes;
  history: History;
  storeValues: StoreValues;
  app: AppInfo;
}

function notATraceReport(): CompatReport {
  return {
    ok: false,
    title: 'Not a deffector trace',
    rows: [{ level: 'error', text: 'Expected format: deffector-trace@1' }],
    mapping: {},
    skippedSteps: [],
    canReplay: false,
  };
}

/** Traces out (export) and in (the compatibility check before a replay). */
export class TraceExchange {
  constructor(private readonly parts: TraceExchangeParts) {}

  private exportContext(): TraceExportContext {
    const { registry, scopes, history, storeValues, app } = this.parts;
    return {
      registry,
      scopes,
      history,
      app,
      effectorVersion,
      agentVersion: AGENT_VERSION,
      readCurrentValue: (scopeId, stateRefId) => storeValues.readCurrent(scopeId, stateRefId),
    };
  }

  /** The trace of a scope (null = the live one), opened at `focus` when the trace has that step. */
  export(scopeId: string | null, focus?: number): TraceFile {
    const trace = exportTrace(this.exportContext(), scopeId);
    if (focus !== undefined && trace.steps.some((step) => step.n <= focus))
      trace.meta.focus = focus;
    return trace;
  }

  /** How the units of a trace map to this page, and what cannot be replayed. */
  checkCompatibility(trace: TraceFile): CompatReport {
    return checkCompat(trace, this.parts.registry.allInfos(), {
      effector: effectorVersion,
      build: this.parts.app.build,
    });
  }

  /** The same for a file the developer picked: it may not be a trace at all. */
  checkImport(candidate: unknown): CompatReport {
    return isTraceFile(candidate) ? this.checkCompatibility(candidate) : notATraceReport();
  }
}
