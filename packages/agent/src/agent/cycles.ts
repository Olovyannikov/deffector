import type { GraphCycle } from '../diagnostics';
import type { UnitGraph } from './graph';

interface Frame {
  id: string;
  /** index of the next successor to visit */
  nextSuccessor: number;
}

/**
 * Strongly connected components of the unit graph (Tarjan), iterative: deep
 * graphs would overflow the call stack. A component of more than one unit, or a
 * unit feeding itself, is a cycle; `isStore` tells whether a store is on it.
 */
export function findCycles(graph: UnitGraph, isStore: (id: string) => boolean): GraphCycle[] {
  const successors = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (edge.kind !== 'next') continue;
    if (!successors.has(edge.from)) successors.set(edge.from, []);
    successors.get(edge.from)!.push(edge.to);
  }
  const successorsOf = (id: string) => successors.get(id) || [];
  let nextIndex = 0;
  const indexOf = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: GraphCycle[] = [];

  const visit = (id: string, frames: Frame[]) => {
    indexOf.set(id, nextIndex);
    lowLink.set(id, nextIndex);
    nextIndex += 1;
    stack.push(id);
    onStack.add(id);
    frames.push({ id, nextSuccessor: 0 });
  };

  const popComponent = (rootId: string) => {
    const component: string[] = [];
    let id: string;
    do {
      id = stack.pop()!;
      onStack.delete(id);
      component.push(id);
    } while (id !== rootId);
    const isSelfLoop = component.length === 1 && successorsOf(component[0]).includes(component[0]);
    if (component.length < 2 && !isSelfLoop) return;
    const isEventsOnly = component.every((unitId) => !isStore(unitId));
    cycles.push({ ids: component.reverse(), isEventsOnly });
  };

  const strongConnect = (startId: string) => {
    const frames: Frame[] = [];
    visit(startId, frames);
    while (frames.length) {
      const top = frames[frames.length - 1];
      const next = successorsOf(top.id);
      if (top.nextSuccessor < next.length) {
        const successor = next[top.nextSuccessor];
        top.nextSuccessor += 1;
        if (!indexOf.has(successor)) visit(successor, frames);
        else if (onStack.has(successor)) {
          lowLink.set(top.id, Math.min(lowLink.get(top.id)!, indexOf.get(successor)!));
        }
        continue;
      }
      frames.pop();
      if (frames.length) {
        const parent = frames[frames.length - 1].id;
        lowLink.set(parent, Math.min(lowLink.get(parent)!, lowLink.get(top.id)!));
      }
      if (lowLink.get(top.id) === indexOf.get(top.id)) popComponent(top.id);
    }
  };

  for (const node of graph.nodes) if (!indexOf.has(node.id)) strongConnect(node.id);
  return cycles;
}
