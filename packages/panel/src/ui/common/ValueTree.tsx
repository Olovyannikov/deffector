import type { Encoded } from '@deffector/protocol';
import { ValueTreeNode } from './ValueTreeNode';

/** Expandable value tree, Chrome console style; the top level starts open. */
export function ValueTree({ value }: { value: Encoded }) {
  return <ValueTreeNode value={value} name={null} depth={0} initiallyOpen />;
}
