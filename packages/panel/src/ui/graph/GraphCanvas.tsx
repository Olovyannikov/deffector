import { useStore, withStableKeys } from '../common';
import { ArrowMarker } from './ArrowMarker';
import type { GraphDrawing } from './buildGraphView';
import { GraphEdgeShape } from './GraphEdgeShape';
import { GraphNodeBox } from './GraphNodeBox';

interface GraphCanvasProps {
  drawing: GraphDrawing;
  /** an explicit focus: a found path or the units of a diagnostic */
  focusIds: string[] | null;
  /** the focus is a path: only consecutive units are joined by hot edges */
  isPath: boolean;
  /** a transaction is highlighted: units it did not touch are dimmed */
  hasStepOrder: boolean;
  onToggleGroup: (key: string) => void;
}

export function GraphCanvas({
  drawing,
  focusIds,
  isPath,
  hasStepOrder,
  onToggleGroup,
}: GraphCanvasProps) {
  const store = useStore();
  const { ui } = store;
  const { positions, visibleFocus, visibleOrder } = drawing;
  const query = ui.graphQuery.toLowerCase();
  const isHotEdge = (from: string, to: string) => {
    if (!focusIds) return visibleOrder.has(from) && visibleOrder.has(to);
    const index = focusIds.indexOf(from);
    return index >= 0 && (isPath ? focusIds[index + 1] === to : focusIds.includes(to));
  };
  const edges = withStableKeys(
    drawing.edges,
    (edge) => `${edge.from}>${edge.to}:${edge.kind}:${edge.via ?? ''}`,
  );
  return (
    <svg
      width={drawing.width}
      height={drawing.height}
      role="img"
      aria-label={store.texts.tabs.graph}
    >
      <defs>
        <ArrowMarker id="ga" className="gm" />
        <ArrowMarker id="gah" className="gmh" />
      </defs>
      {edges.map(({ key, item: edge }) => (
        <GraphEdgeShape
          key={key}
          edge={edge}
          from={positions.get(edge.from)!}
          to={positions.get(edge.to)!}
          isHot={isHotEdge(edge.from, edge.to)}
          showOperators={ui.showGraphOperators}
        />
      ))}
      {drawing.nodes.map((node) => {
        const badgeNumber =
          isPath && focusIds
            ? focusIds.indexOf(node.id) + 1 || undefined
            : visibleOrder.get(node.id);
        const isInFocus = visibleFocus.has(node.id);
        const isDim = (hasStepOrder || focusIds) && !badgeNumber && !isInFocus;
        const className = [
          'gn',
          (badgeNumber || (isInFocus && focusIds)) && 'hot',
          isDim && 'dim',
          node.group && 'grp',
          ui.selectedUnit === node.id && 'focus',
          query && node.name.toLowerCase().includes(query) && 'focus',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <GraphNodeBox
            key={node.id}
            node={node}
            position={positions.get(node.id)!}
            badgeNumber={badgeNumber}
            className={className}
            onToggleGroup={onToggleGroup}
          />
        );
      })}
    </svg>
  );
}
