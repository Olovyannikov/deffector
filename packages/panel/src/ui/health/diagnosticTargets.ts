import type { Diagnostic } from '@deffector/protocol';
import type { PanelStore } from '../../store';

/** Problems that live in the graph: a cycle, a glitch between units, a runaway loop. */
const GRAPH_CODES = new Set([
  'event-cycle',
  'store-cycle',
  'emergency-stop',
  'stale-read',
  'double-update',
  'derived-write',
]);

export function isShownInGraph(diagnostic: Diagnostic): boolean {
  return GRAPH_CODES.has(diagnostic.code);
}

/** Opens what a diagnostic is about: its last transaction, or the store it names. */
export function openDiagnostic(store: PanelStore, diagnostic: Diagnostic) {
  if (diagnostic.txId) {
    store.setUI({ tab: 'log', selectedTransactionId: diagnostic.txId });
    return;
  }
  const { node } = diagnostic;
  if (node && store.units.get(node)?.kind === 'store')
    store.setUI({ tab: 'stores', selectedUnit: node });
}

/** Shows the units of a diagnostic highlighted in the Graph tab. */
export function showDiagnosticInGraph(store: PanelStore, diagnostic: Diagnostic) {
  const { node, nodes } = diagnostic;
  let focus: string[] | null = null;
  if (nodes?.length) focus = nodes;
  else if (node) focus = [node];
  store.setUI({ tab: 'graph', graphFocus: focus, selectedUnit: node ?? null });
}

/** `src/model.ts:12` → the file and the line; a location without a line is all file. */
export function parseLocation(location: string): { file: string; line: number | undefined } {
  const match = /^(.*?):(\d+)$/.exec(location);
  return match ? { file: match[1], line: Number(match[2]) } : { file: location, line: undefined };
}
