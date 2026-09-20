import type { SequenceMessage } from './buildSequence';

interface SequenceArrowProps {
  message: SequenceMessage;
  fromX: number;
  toX: number;
  y: number;
}

/** A message between lifelines; a unit that messages itself gets a loop. */
export function SequenceArrow({ message, fromX, toX, y }: SequenceArrowProps) {
  const isSelfMessage = message.from === message.to;
  const isFiltered = message.status === 'filtered';
  const className = `sqe${message.isDashed ? ' dash' : ''} s-${message.status}`;
  const textX = isSelfMessage ? fromX + 32 : (fromX + toX) / 2;
  const textAnchor = isSelfMessage ? 'start' : 'middle';
  return (
    <g>
      {isSelfMessage ? (
        <path d={`M${fromX} ${y} h26 v10 h-24`} className={className} markerEnd="url(#sqa)" />
      ) : (
        <line
          x1={fromX}
          x2={toX + (toX > fromX ? -3 : 3)}
          y1={y}
          y2={y}
          className={className}
          markerEnd={isFiltered ? undefined : 'url(#sqa)'}
        />
      )}
      {isFiltered && (
        <text x={toX + (isSelfMessage ? 30 : 0)} y={y + 4} textAnchor="middle" className="sqx">
          ✕
        </text>
      )}
      <text x={textX} y={y - 5} textAnchor={textAnchor} className="sqt">
        {message.label}
      </text>
      <text x={textX} y={y + 12} textAnchor={textAnchor} className={`sqv s-${message.status}`}>
        {message.value}
      </text>
    </g>
  );
}
