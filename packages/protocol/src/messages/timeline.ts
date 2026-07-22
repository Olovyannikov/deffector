export type TimelineMode = 'live' | 'past' | 'replay';

export interface TimelineState {
  mode: TimelineMode;
  /** transaction the app currently shows, null = present */
  cursor: number | null;
  liveScopeId: string | null;
  viewScopeId: string | null;
  recording: boolean;
  replay?: { i: number; total: number; label: string };
  readOnlyLabel?: string;
  /** how jumps are applied: by swapping a forked scope, or in place with launch */
  strategy: 'fork' | 'in-place' | 'none';
  /** while in the past, the page is covered so clicks cannot change it */
  locked?: boolean;
}
