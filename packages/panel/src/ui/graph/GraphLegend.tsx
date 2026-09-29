import { useStore } from '../common';

const LEGEND_GLYPHS = ['g-event', 'g-store', 'g-derived', 'g-effect'];

export function GraphLegend() {
  const { texts } = useStore();
  return (
    <div className="legend" style={{ marginLeft: 'auto' }}>
      {LEGEND_GLYPHS.map((glyph, index) => (
        <span key={glyph}>
          <i className={`g ${glyph}`} />
          {texts.graph.legend[index]}
        </span>
      ))}
      <span>{texts.graph.read}</span>
    </div>
  );
}
