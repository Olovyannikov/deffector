import { glyphClass, truncateLabel, useStore } from '../common';
import { NODE_HEIGHT, NODE_WIDTH } from './graphGeometry';
import type { GraphViewNode, Point } from './graphTypes';

const MAX_NAME_LENGTH = 24;

interface GraphNodeBoxProps {
  node: GraphViewNode;
  position: Point;
  /** step number of the highlighted transaction or path, shown in a badge */
  badgeNumber: number | undefined;
  className: string;
  onToggleGroup: (key: string) => void;
}

/** A unit (click selects it, double click opens a store in Stores) or a group (double click expands). */
export function GraphNodeBox({
  node,
  position,
  badgeNumber,
  className,
  onToggleGroup,
}: GraphNodeBoxProps) {
  const store = useStore();
  const unit = store.units.get(node.id);
  const { group } = node;
  const onDoubleClick = () => {
    if (group) onToggleGroup(group.key);
    else if (unit?.kind === 'store') store.setUI({ tab: 'stores', selectedUnit: node.id });
  };
  return (
    <g
      className={className}
      transform={`translate(${position.x},${position.y})`}
      onClick={() => {
        if (!group) store.setUI({ selectedUnit: node.id });
      }}
      onDoubleClick={onDoubleClick}
    >
      <title>{`${node.name}${node.file ? ` · ${node.file}` : ''}`}</title>
      <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx={6} />
      {!group && (
        <foreignObject x={8} y={9} width={10} height={10}>
          <span className={`g ${glyphClass(unit ?? node)}`} />
        </foreignObject>
      )}
      <text x={group ? 10 : 24} y={17}>
        {truncateLabel(node.name, MAX_NAME_LENGTH)}
      </text>
      {badgeNumber && (
        <g className="gord" transform={`translate(${NODE_WIDTH - 4},-4)`}>
          <circle r={8} />
          <text textAnchor="middle" y={3.5}>
            {badgeNumber}
          </text>
        </g>
      )}
    </g>
  );
}
