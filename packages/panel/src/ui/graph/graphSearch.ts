import type { GraphEdge, GraphNode } from '@deffector/protocol';

/** Units within `depth` edges of the focus, in either direction. */
export function neighbourhood(
  edges: readonly GraphEdge[],
  focus: ReadonlySet<string>,
  depth: number,
): Set<string> {
  const adjacent = new Map<string, string[]>();
  const link = (from: string, to: string) => {
    const list = adjacent.get(from) ?? [];
    list.push(to);
    adjacent.set(from, list);
  };
  for (const edge of edges) {
    link(edge.from, edge.to);
    link(edge.to, edge.from);
  }
  const reached = new Set(focus);
  let frontier = [...focus];
  for (let level = 0; level < depth; level++) {
    const next: string[] = [];
    for (const id of frontier)
      for (const neighbour of adjacent.get(id) || [])
        if (!reached.has(neighbour)) {
          reached.add(neighbour);
          next.push(neighbour);
        }
    frontier = next;
  }
  return reached;
}

/** Shortest directed path (BFS over next and read edges). */
export function findPath(edges: readonly GraphEdge[], from: string, to: string): string[] | null {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge.to);
    outgoing.set(edge.from, list);
  }
  const previous = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const id = queue.shift()!;
    if (id === to) {
      const path: string[] = [];
      for (let step: string | null = to; step !== null; step = previous.get(step) ?? null)
        path.unshift(step);
      return path;
    }
    for (const next of outgoing.get(id) || [])
      if (!previous.has(next)) {
        previous.set(next, id);
        queue.push(next);
      }
  }
  return null;
}

/** A node by its exact name, else by a case-insensitive part of it, else `text` taken as a unit id. */
export function findNodeIdByName(
  nodes: readonly GraphNode[],
  text: string,
  isKnownUnitId: (id: string) => boolean,
): string | null {
  const query = text.trim();
  if (!query) return null;
  const exact = nodes.find((node) => node.name === query);
  if (exact) return exact.id;
  const lowerQuery = query.toLowerCase();
  const partial = nodes.find((node) => node.name.toLowerCase().includes(lowerQuery));
  if (partial) return partial.id;
  return isKnownUnitId(query) ? query : null;
}
