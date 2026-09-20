import { useState } from 'react';
import type { Encoded } from '@deffector/protocol';
import { childEntries } from './childEntries';
import { ValuePreview } from './ValuePreview';

/** Children shown under an open node: a huge array would freeze the panel. */
const MAX_CHILDREN = 200;

interface ValueTreeNodeProps {
  value: Encoded;
  /** key in the parent, or the store name at the top; null shows the value alone */
  name: string | null;
  depth: number;
  initiallyOpen: boolean;
}

export function ValueTreeNode({ value, name, depth, initiallyOpen }: ValueTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const children = childEntries(value);
  const hasChildren = !!children && children.length > 0;
  return (
    <div style={{ paddingLeft: depth ? 14 : 0 }}>
      <div className="vt-row">
        {hasChildren ? (
          <button
            className="vt-tog"
            type="button"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? '▾' : '▸'}
          </button>
        ) : (
          <span className="vt-tog" />
        )}
        {name !== null && <span className="vt-key">{name}:</span>}
        <ValuePreview value={value} maxLength={isOpen && hasChildren ? 40 : 120} />
      </div>
      {hasChildren &&
        isOpen &&
        children
          .slice(0, MAX_CHILDREN)
          .map(([key, child]) => (
            <ValueTreeNode
              key={key}
              value={child}
              name={key}
              depth={depth + 1}
              initiallyOpen={false}
            />
          ))}
    </div>
  );
}
