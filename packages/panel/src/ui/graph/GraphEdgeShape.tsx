import { truncateLabel } from '../common';
import { edgeGeometry } from './edgeGeometry';
import type { GraphViewEdge, Point } from './graphTypes';

const MAX_LABEL_LENGTH = 28;

/** The operator an edge goes through, and how many edges a merged one stands for. */
function edgeLabel(edge: GraphViewEdge): string {
  const operator = edge.via || (edge.kind === 'read' ? 'read' : '');
  return operator + (edge.count ? ` ×${edge.count}` : '');
}

interface GraphEdgeShapeProps {
  edge: GraphViewEdge;
  from: Point;
  to: Point;
  isHot: boolean;
  showOperators: boolean;
}

export function GraphEdgeShape({ edge, from, to, isHot, showOperators }: GraphEdgeShapeProps) {
  const { path, labelX, labelY } = edgeGeometry(from, to);
  const label = showOperators ? edgeLabel(edge) : '';
  const isRead = edge.kind === 'read';
  return (
    <g>
      <path
        d={path}
        className={`ge${isRead ? ' rd' : ''}${isHot ? ' hot' : ''}`}
        markerEnd={isHot ? 'url(#gah)' : 'url(#ga)'}
      >
        <title>{edge.via || edge.kind}</title>
      </path>
      {label && (
        <text x={labelX} y={isRead ? labelY + 11 : labelY - 3} textAnchor="middle" className="gel">
          {truncateLabel(label, MAX_LABEL_LENGTH)}
        </text>
      )}
    </g>
  );
}
