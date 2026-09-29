import type { GraphEdge, GraphNode } from '@deffector/protocol';
import type { GraphGroup } from '../../store';
import { layoutGraph, type GraphLayout } from './graphLayout';
import type { GraphViewEdge, GraphViewNode } from './graphTypes';
import { neighbourhood } from './graphSearch';
import { collapseGroups, groupKeyOf } from './groupNodes';

/** More nodes than this are not drawn at once unless "whole graph" is on: only a neighbourhood. */
const MAX_NODES_UNFOCUSED = 120;

export interface GraphViewInput {
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  showInternal: boolean;
  grouping: GraphGroup;
  showAll: boolean;
  depth: number;
  selectedUnit: string | null;
  /** an explicit focus: a found path or the units of a diagnostic */
  focusIds: string[] | null;
  /** step order of the selected transaction (empty with an explicit focus) */
  stepOrder: ReadonlyMap<string, number>;
  expandedGroups: ReadonlySet<string>;
}

export interface GraphDrawing extends GraphLayout {
  kind: 'drawing';
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  /** focused units as drawn (a unit in a collapsed group is its group) */
  visibleFocus: Set<string>;
  /** step order on the drawn nodes: a group takes the earliest step of its units */
  visibleOrder: Map<string, number>;
}

export type GraphView = { kind: 'too-big'; nodeCount: number } | GraphDrawing;

function focusOf(input: GraphViewInput, shownIds: ReadonlySet<string>): Set<string> {
  if (input.focusIds) return new Set(input.focusIds);
  const focus = new Set<string>();
  if (input.selectedUnit && shownIds.has(input.selectedUnit)) focus.add(input.selectedUnit);
  for (const id of input.stepOrder.keys()) if (shownIds.has(id)) focus.add(id);
  return focus;
}

/** Groups that hold something in focus stay open. */
function groupsToOpen(input: GraphViewInput, nodes: readonly GraphNode[]): Set<string> {
  const open = new Set(input.expandedGroups);
  if (input.grouping === 'none') return open;
  // only an explicit focus opens its group: the last transaction may touch every group
  const explicit = new Set(input.focusIds || (input.selectedUnit ? [input.selectedUnit] : []));
  for (const node of nodes) {
    if (!explicit.has(node.id)) continue;
    const key = groupKeyOf(node, input.grouping);
    if (key) open.add(key);
  }
  return open;
}

/** What the Graph tab draws: filtered, grouped, cut to the focus when too big, and laid out. */
export function buildGraphView(input: GraphViewInput): GraphView {
  const shownNodes = input.graph.nodes.filter((node) => input.showInternal || !node.internal);
  const focus = focusOf(input, new Set(shownNodes.map((node) => node.id)));
  const collapsed = collapseGroups(
    shownNodes,
    input.graph.edges,
    input.grouping,
    groupsToOpen(input, shownNodes),
  );
  const visibleId = (id: string) => collapsed.visibleIdOf.get(id) ?? id;
  const visibleFocus = new Set([...focus].map(visibleId));
  let { nodes } = collapsed;
  if (!input.showAll && nodes.length > MAX_NODES_UNFOCUSED) {
    if (!visibleFocus.size) return { kind: 'too-big', nodeCount: nodes.length };
    const depth = input.focusIds ? Math.min(1, input.depth) : input.depth;
    const kept = neighbourhood(collapsed.edges, visibleFocus, depth);
    nodes = nodes.filter((node) => kept.has(node.id));
  }
  const drawnIds = new Set(nodes.map((node) => node.id));
  const edges = collapsed.edges.filter((edge) => drawnIds.has(edge.from) && drawnIds.has(edge.to));
  const visibleOrder = new Map<string, number>();
  for (const [id, order] of input.stepOrder) {
    const drawnId = visibleId(id);
    const earlier = visibleOrder.get(drawnId);
    if (earlier === undefined || earlier > order) visibleOrder.set(drawnId, order);
  }
  return {
    kind: 'drawing',
    nodes,
    edges,
    visibleFocus,
    visibleOrder,
    ...layoutGraph(nodes, edges),
  };
}
