import type { SourceLocation } from './sourceLocation';

const MAX_NAME_LENGTH = 96;

/** effector names nested combines `combine(combine(combine(…` — that grows quadratically in big graphs */
export function shortName(name: string, max = MAX_NAME_LENGTH): string {
  if (name.length <= max) return name;
  // keep the start (what it is) and the end (the latest sources); O(1) in the name length
  const headLength = Math.floor(max * 0.4);
  return `${name.slice(0, headLength)}…${name.slice(name.length - (max - headLength - 1))}`;
}

/** A unit created without a name (no babel/swc plugin, no { name }): kind + where it was created. */
export function anonymousName(op: string, id: string, location: SourceLocation): string {
  const kind = op === 'store' ? '$store' : op;
  if (location.file) return `${kind}@${location.file.split(/[\\/]/).pop()}:${location.line}`;
  return `${kind}#${id}`;
}

export interface OperatorNameParts {
  op: string;
  /** the name given to the operator itself (`sample({ name })`) */
  ownName: unknown;
  /** names of the nodes the operator writes to */
  targets: string[];
  /** names of the units that own the operator (its sources) */
  owners: string[];
}

/** A readable label for an operator node: `$email.on(emailChanged)`, `sample($a → b)`. */
export function operatorName({ op, ownName, targets, owners }: OperatorNameParts): string {
  const firstTarget = targets[0] ?? '?';
  const firstOwner = owners[0] ?? '?';
  switch (op) {
    case 'on':
      return `${firstTarget}.on(${owners.join(', ')})`;
    case 'map':
      return `${firstOwner}.map → ${firstTarget}`;
    case 'filterMap':
    case 'filter':
      return `${firstOwner}.${op}`;
    case 'watch':
      return `${firstOwner}.watch`;
    case 'fx':
      return `${firstOwner} handler`;
    case 'sample':
      if (ownName) return `sample "${ownName}"`;
      return `sample(${owners.join(', ')} → ${targets.join(', ') || '?'})`;
    case 'combine':
      return `combine(${owners.join(', ')})`;
    case 'reinit':
      return `${firstTarget}.reinit`;
    default:
      return `${op}(${owners.join(', ')})${targets.length ? ` → ${targets.join(', ')}` : ''}`;
  }
}
