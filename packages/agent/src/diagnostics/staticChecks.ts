import type { Diagnostic } from '@deffector/protocol';
import type { Texts } from '../i18n';
import type { Registry } from '../registry';
import type { Scopes } from '../scopes';
import { checkDuplicateSids, checkMissingSids, checkUnknownServerSids } from './sidChecks';
import type { GraphCycle } from './types';
import { joinFirst, type UnitLabels } from './unitLabels';
import { checkUnitLeaks } from './unitLeaks';

const CYCLES_SHOWN = 10;

export interface StaticCheckInput {
  registry: Registry;
  scopes: Scopes;
  labels: UnitLabels;
  texts: Texts;
  hasTransactions: boolean;
  cycles: GraphCycle[];
  /** recording was paused without a panel, so the start of the history is missing */
  hasResumedAfterPause: boolean;
  graceSeconds: number;
  hasInspectorConflict: boolean;
}

function checkScopeMode({ scopes, texts, hasTransactions }: StaticCheckInput): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (!scopes.isForkUsed && hasTransactions) {
    diagnostics.push({
      id: 'static:global',
      level: 'warning',
      code: 'global-mode',
      count: 1,
      title: texts.globalTitle,
      detail: texts.globalDetail,
      fix: texts.globalFix,
    });
  }
  if (scopes.isForkUsed && !scopes.hasSwitcher()) {
    diagnostics.push({
      id: 'static:no-adapter',
      level: 'warning',
      code: 'no-adapter',
      count: 1,
      title: texts.noAdapterTitle,
      detail: texts.noAdapterDetail,
      fix: texts.noAdapterFix,
    });
  }
  return diagnostics;
}

function describeCycle(cycle: GraphCycle, labels: UnitLabels, texts: Texts): Diagnostic {
  const names = joinFirst(
    cycle.ids.map((id) => labels.name(id)),
    6,
    ' → ',
    ' → …',
  );
  const common = {
    id: `static:cycle:${[...cycle.ids].sort().join(',')}`,
    count: 1,
    node: cycle.ids[0],
    nodes: cycle.ids,
    file: labels.location(cycle.ids[0]),
  };
  if (cycle.isEventsOnly) {
    return {
      ...common,
      level: 'warning',
      code: 'event-cycle',
      title: texts.eventCycleTitle(names),
      detail: texts.eventCycleDetail,
      fix: texts.eventCycleFix,
    };
  }
  return {
    ...common,
    level: 'info',
    code: 'store-cycle',
    title: texts.storeCycleTitle(names),
    detail: texts.storeCycleDetail,
  };
}

function checkAgentState(input: StaticCheckInput): Diagnostic[] {
  const { texts } = input;
  const diagnostics: Diagnostic[] = [];
  if (input.hasResumedAfterPause) {
    diagnostics.push({
      id: 'static:paused',
      level: 'info',
      code: 'paused',
      count: 1,
      title: texts.pausedTitle,
      detail: texts.pausedDetail(input.graceSeconds),
      fix: texts.pausedFix,
    });
  }
  if (input.hasInspectorConflict) {
    diagnostics.push({
      id: 'static:conflict',
      level: 'error',
      code: 'inspector-conflict',
      count: 1,
      title: texts.conflictTitle,
      detail: texts.conflictDetail,
      fix: texts.conflictFix,
    });
  }
  return diagnostics;
}

/** Checks that depend on units, scopes and the agent itself, not on transactions. */
export function collectStaticDiagnostics(input: StaticCheckInput): Diagnostic[] {
  const { registry, scopes, labels, texts } = input;
  const missingSids = checkMissingSids(registry, texts);
  const unknownServerSids = checkUnknownServerSids(registry, scopes, texts);
  return [
    ...(missingSids ? [missingSids] : []),
    ...checkDuplicateSids(registry, labels, texts),
    ...checkScopeMode(input),
    ...(unknownServerSids ? [unknownServerSids] : []),
    ...checkUnitLeaks(registry, texts),
    ...input.cycles.slice(0, CYCLES_SHOWN).map((cycle) => describeCycle(cycle, labels, texts)),
    ...checkAgentState(input),
  ];
}
