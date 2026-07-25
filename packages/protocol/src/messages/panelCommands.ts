import type { Encoded } from '../encoding';
import type { TraceFile } from '../trace';
import type { FxOverride } from './effectOverrides';
import type { IgnoreRule } from './transactions';

/** Panel → agent. */
export type PanelCommand =
  | { type: 'connect'; locale?: 'ru' | 'en' }
  | { type: 'disconnect' }
  | { type: 'ping' }
  | { type: 'reclaim' }
  | { type: 'get-state'; requestId: string; scopeId: string; txId: number | null }
  | { type: 'jump'; txId: number | null }
  | {
      type: 'edit';
      requestId: string;
      scopeId: string;
      node: string;
      value: Encoded;
      mode: 'live' | 'silent';
      label?: string;
    }
  | {
      type: 'edit-many';
      requestId: string;
      scopeId: string;
      values: Record<string, Encoded>;
      label: string;
      mode?: 'live' | 'silent';
    }
  | { type: 'dispatch'; requestId: string; scopeId: string; node: string; payload: Encoded }
  | { type: 'set-recording'; on: boolean }
  | { type: 'clear' }
  | { type: 'commit' }
  | { type: 'revert' }
  | { type: 'skip'; txId: number }
  | { type: 'export'; requestId: string; scopeId: string | null; focus?: number }
  | { type: 'check-import'; requestId: string; trace: unknown }
  | { type: 'replay'; requestId: string; trace: TraceFile; mode: 'animated' | 'instant' }
  | { type: 'get-graph'; requestId: string }
  | { type: 'note'; txId: number; text: string }
  | { type: 'set-ignore'; rules: IgnoreRule[] }
  | { type: 'set-lock'; on: boolean }
  | { type: 'fx-override'; override: FxOverride }
  | { type: 'fx-clear'; node: string | null }
  | { type: 'check-consistency'; requestId: string; scopeId: string }
  | { type: 'resolve-source'; requestId: string; file: string; line?: number };
