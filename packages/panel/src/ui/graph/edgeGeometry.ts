import { NODE_HEIGHT, NODE_WIDTH } from './graphGeometry';
import type { Point } from './graphTypes';

export interface EdgeGeometry {
  /** SVG path */
  path: string;
  /** where the label goes */
  labelX: number;
  labelY: number;
}

/**
 * A forward edge is a horizontal S-curve from the right side of the source to the left side of the
 * target; an edge going back (or within a layer) dips below both boxes.
 */
export function edgeGeometry(from: Point, to: Point): EdgeGeometry {
  if (to.x > from.x) {
    const startX = from.x + NODE_WIDTH;
    const startY = from.y + NODE_HEIGHT / 2;
    const endX = to.x - 2;
    const endY = to.y + NODE_HEIGHT / 2;
    return {
      path: `M${startX} ${startY} C${startX + 60} ${startY} ${endX - 60} ${endY} ${endX} ${endY}`,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2,
    };
  }
  const startX = from.x + NODE_WIDTH / 2;
  const startY = from.y + NODE_HEIGHT;
  const endX = to.x + NODE_WIDTH / 2;
  const endY = to.y + NODE_HEIGHT + 2;
  const dipY = Math.max(startY, endY) + 30;
  return {
    path: `M${startX} ${startY} C${startX} ${dipY} ${endX} ${dipY} ${endX} ${endY}`,
    labelX: (startX + endX) / 2,
    labelY: dipY - 8,
  };
}
