/** Arrowhead for graph edges; `className` colours it (plain or highlighted). */
export function ArrowMarker({ id, className }: { id: string; className: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M0 0L10 5L0 10z" className={className} />
    </marker>
  );
}
