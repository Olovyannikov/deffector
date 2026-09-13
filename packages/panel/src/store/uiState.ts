import type { TimelineState } from '@deffector/protocol';

export type TabId = 'log' | 'stores' | 'effects' | 'graph' | 'traces' | 'health';

/** Panel tabs in toolbar order; keys 1–6 switch to them. */
export const TAB_IDS: readonly TabId[] = ['log', 'stores', 'effects', 'graph', 'traces', 'health'];

/** Tabs of the transaction inspector next to the log. */
export type InspectorTabId = 'why' | 'sequence' | 'diff' | 'state' | 'payload';

export const INSPECTOR_TAB_IDS: readonly InspectorTabId[] = [
  'why',
  'sequence',
  'diff',
  'state',
  'payload',
];

/** The chips above the log: which kind of transactions to show. */
export type LogKindFilter = 'all' | 'event' | 'effect' | 'edit' | 'problems';

export const LOG_KIND_FILTERS: readonly LogKindFilter[] = [
  'all',
  'event',
  'effect',
  'edit',
  'problems',
];

export type GraphGroup = 'none' | 'file' | 'factory' | 'domain' | 'model';

export type StoresGroup = 'file' | 'factory' | 'domain' | 'model' | 'kind';

export interface UIState {
  tab: TabId;
  inspectorTab: InspectorTabId;
  /** transaction picked in the log; null follows the time-travel cursor or the newest one */
  selectedTransactionId: number | null;
  /** regex (or plain text when it is not a valid regex) over transaction labels */
  nameFilter: string;
  kindFilter: LogKindFilter;
  /** a scope id, or 'all' */
  scopeFilter: string;
  showInternal: boolean;
  selectedUnit: string | null;
  storesGroup: StoresGroup;
  storesView: 'list' | 'snapshot';
  graphQuery: string;
  graphDepth: number;
  /** show the whole graph even when it is too big to lay out comfortably */
  graphAll: boolean;
  graphGroup: GraphGroup;
  showGraphOperators: boolean;
  /** units to focus and highlight (a path or a cycle) */
  graphFocus: string[] | null;
  isPaletteOpen: boolean;
  isFiltersMenuOpen: boolean;
}

export function createInitialUIState(): UIState {
  return {
    tab: 'log',
    inspectorTab: 'why',
    selectedTransactionId: null,
    nameFilter: '',
    kindFilter: 'all',
    scopeFilter: 'all',
    showInternal: false,
    selectedUnit: null,
    storesGroup: 'file',
    storesView: 'list',
    graphQuery: '',
    graphDepth: 2,
    graphAll: false,
    graphGroup: 'none',
    showGraphOperators: false,
    graphFocus: null,
    isPaletteOpen: false,
    isFiltersMenuOpen: false,
  };
}

/** What the panel assumes until the agent reports its timeline. */
export function createInitialTimeline(): TimelineState {
  return {
    mode: 'live',
    cursor: null,
    liveScopeId: null,
    viewScopeId: null,
    recording: true,
    strategy: 'none',
  };
}
