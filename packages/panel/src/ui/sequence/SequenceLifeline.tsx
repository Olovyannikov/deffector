import { glyphClass, useStore } from '../common';
import { COLUMN_WIDTH, HEADER_HEIGHT } from './sequenceLayout';

interface SequenceLifelineProps {
  actor: string;
  centerX: number;
  diagramHeight: number;
}

export function SequenceLifeline({ actor, centerX, diagramHeight }: SequenceLifelineProps) {
  const unit = useStore().units.get(actor);
  return (
    <g>
      <line
        x1={centerX}
        x2={centerX}
        y1={HEADER_HEIGHT - 8}
        y2={diagramHeight - 8}
        className="sql"
      />
      <foreignObject x={centerX - COLUMN_WIDTH / 2 + 6} y={6} width={COLUMN_WIDTH - 12} height={28}>
        <div className="sqh" title={unit?.name}>
          <span className={`g ${glyphClass(unit)}`} />
          {unit?.name ?? actor}
        </div>
      </foreignObject>
    </g>
  );
}
