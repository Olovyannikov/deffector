import type { Encoded } from '../encoding';
import type { CompatReport, TraceFile } from '../trace';
import type { Diagnostic } from './diagnostics';
import type { FxOverride } from './effectOverrides';
import type { TimelineState } from './timeline';
import type { Tx } from './transactions';
import type { GraphEdge, GraphNode, ScopeInfo, UnitInfo } from './units';

export interface HelloInfo {
  protocol: number;
  /** random id of the agent instance: changes when the page reloads */
  instance: string;
  agent: { version: string };
  effector: { version: string };
  app: { name: string; url: string; build?: string };
  mode: 'deep';
  sidCoverage: { withSid: number; total: number };
}

/** Agent → panel. Replies to a command carry the command's `requestId`. */
export type AgentMessage =
  /** `listening` is false until a panel sent `connect`: a panel seeing false must (re)send connect */
  | { type: 'hello'; info: HelloInfo; listening: boolean }
  | { type: 'units'; units: UnitInfo[] }
  | { type: 'scopes'; scopes: ScopeInfo[] }
  | { type: 'txs'; txs: Tx[] }
  | { type: 'tx-update'; tx: Tx }
  | { type: 'cleared'; keepFrom: number | null }
  | {
      type: 'state';
      requestId: string;
      scopeId: string;
      txId: number | null;
      values: Record<string, Encoded>;
    }
  | { type: 'diagnostics'; items: Diagnostic[] }
  | { type: 'timeline'; state: TimelineState }
  | { type: 'trace'; requestId: string; trace: TraceFile; test: string }
  | { type: 'compat'; requestId: string; report: CompatReport }
  | { type: 'graph'; requestId: string; nodes: GraphNode[]; edges: GraphEdge[] }
  | { type: 'result'; requestId: string; ok: boolean; message?: string }
  | { type: 'reset' }
  | { type: 'overrides'; items: FxOverride[] }
  | { type: 'source'; requestId: string; url: string | null; line?: number };
