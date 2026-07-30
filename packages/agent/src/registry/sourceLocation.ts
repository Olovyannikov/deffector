import type { FactoryInfo } from '@deffector/protocol';
import type { Node, RegionStack } from '../effector';

export interface SourceLocation {
  file?: string;
  line?: number;
  column?: number;
}

const EFFECTOR_FRAME = /node_modules[\\/]effector|effector\.(mjs|cjs)|\/effector\//;
const STACK_FRAME = /\(?((?:https?:\/\/[^/]+)?[^\s()]+?):(\d+):(\d+)\)?\s*$/;

/** `effector/enable_debug_traces` stores an Error().stack per unit: take the first frame outside effector. */
export function parseUnitTrace(trace: string): SourceLocation {
  const frames = trace.split('\n').slice(1);
  for (const frame of frames) {
    if (EFFECTOR_FRAME.test(frame)) continue;
    const match = STACK_FRAME.exec(frame.trim());
    if (!match) continue;
    const file = match[1]
      .replace(/^https?:\/\/[^/]+\//, '')
      .replace(/\?.*$/, '')
      .replace(/^@fs\//, '/');
    return { file, line: Number(match[2]), column: Number(match[3]) };
  }
  return {};
}

/** Where a unit was created: the babel/swc plugin's `loc`, or a debug trace. */
export function readLocation(meta: Record<string, any>): SourceLocation {
  const location = (meta.config && meta.config.loc) || meta.loc;
  if (location && typeof location.file === 'string') {
    return { file: location.file, line: location.line, column: location.column };
  }
  if (typeof meta.unitTrace === 'string') return parseUnitTrace(meta.unitTrace);
  return {};
}

/** The innermost factory (withFactory region) a unit was created in. */
export function readFactory(regionStack: RegionStack | null): FactoryInfo | undefined {
  for (let region = regionStack; region; region = region.parent) {
    const meta = region.meta || {};
    if (meta.type !== 'factory') continue;
    const location = meta.loc || {};
    return {
      name: meta.name,
      sid: meta.sid,
      method: meta.method,
      file: location.file,
      line: location.line,
    };
  }
  return undefined;
}

/** The full domain path of a unit: `auth/session`. */
export function domainOf(node: Node): string | undefined {
  const fullName = node.meta?.config?.parent?.compositeName?.fullName;
  if (typeof fullName === 'string' && fullName) return fullName;
  const names = (node.family?.owners || [])
    .filter((owner) => owner.meta?.op === 'domain')
    .map((owner) => owner.meta.name)
    .filter(Boolean);
  return names.length ? names.reverse().join('/') : undefined;
}
