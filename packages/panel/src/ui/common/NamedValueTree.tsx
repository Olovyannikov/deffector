import type { Encoded } from '@deffector/protocol';
import { ValueTreeNode } from './ValueTreeNode';

/** A value tree with a name before the value: `$count: 3`. */
export function NamedValueTree({ name, value }: { name: string; value: Encoded }) {
  return <ValueTreeNode value={value} name={name} depth={0} initiallyOpen />;
}
