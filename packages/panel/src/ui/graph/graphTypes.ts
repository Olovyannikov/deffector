import type { GraphEdge, GraphNode } from '@deffector/protocol';

/** A node as drawn: a unit, or a collapsed group of units. */
export interface GraphViewNode extends GraphNode {
  group?: { key: string; count: number };
}

/** An edge as drawn; edges merged between groups carry how many they stand for. */
export interface GraphViewEdge extends GraphEdge {
  count?: number;
}

export interface Point {
  x: number;
  y: number;
}
