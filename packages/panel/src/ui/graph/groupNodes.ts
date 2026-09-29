import type { GraphEdge, GraphNode } from '@deffector/protocol';
import type { GraphGroup } from '../../store';
import type { GraphViewEdge, GraphViewNode } from './graphTypes';

export function groupKeyOf(node: GraphNode, grouping: GraphGroup): string | null {
  switch (grouping) {
    case 'file':
      return node.file || null;
    case 'factory':
      return node.factory || null;
    case 'domain':
      return node.domain || null;
    case 'model':
      return node.model || null;
    default:
      return null;
  }
}

export interface CollapsedGraph {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  /** unit id → id of the node that shows it: itself, or its group */
  visibleIdOf: Map<string, string>;
}

/** Collapse each group into one node unless it is expanded; edges are merged and counted. */
export function collapseGroups(
  nodes: GraphNode[],
  edges: GraphEdge[],
  grouping: GraphGroup,
  expanded: ReadonlySet<string>,
): CollapsedGraph {
  const visibleIdOf = new Map<string, string>();
  if (grouping === 'none') {
    for (const node of nodes) visibleIdOf.set(node.id, node.id);
    return { nodes, edges, visibleIdOf };
  }
  const groups = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    const key = groupKeyOf(node, grouping);
    if (!key || expanded.has(key)) {
      visibleIdOf.set(node.id, node.id);
      continue;
    }
    const members = groups.get(key) ?? [];
    members.push(node);
    groups.set(key, members);
  }
  const shown: GraphViewNode[] = nodes.filter((node) => visibleIdOf.get(node.id) === node.id);
  for (const [key, members] of groups) {
    // a group of one is just that unit
    if (members.length === 1) {
      visibleIdOf.set(members[0].id, members[0].id);
      shown.push(members[0]);
      continue;
    }
    const groupId = `grp:${key}`;
    for (const member of members) visibleIdOf.set(member.id, groupId);
    const shortName = key.split(/[\\/]/).pop() || key;
    shown.push({
      id: groupId,
      kind: 'group',
      name: `${shortName} (${members.length})`,
      derived: false,
      internal: false,
      file: key,
      group: { key, count: members.length },
    });
  }
  const merged = new Map<string, GraphViewEdge>();
  for (const edge of edges) {
    const from = visibleIdOf.get(edge.from);
    const to = visibleIdOf.get(edge.to);
    if (!from || !to || from === to) continue;
    const key = `${from}>${to}${edge.kind}`;
    const existing = merged.get(key);
    if (existing) existing.count = (existing.count || 1) + 1;
    else merged.set(key, { ...edge, from, to });
  }
  return { nodes: shown, edges: [...merged.values()], visibleIdOf };
}
