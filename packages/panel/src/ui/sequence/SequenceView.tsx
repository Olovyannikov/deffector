import type { Tx } from '@deffector/protocol';
import { useStore } from '../common';
import { buildSequence } from './buildSequence';
import { SequenceArrow } from './SequenceArrow';
import { SequenceLifeline } from './SequenceLifeline';
import { COLUMN_WIDTH, HEADER_HEIGHT, OUTSIDE_X, ROW_HEIGHT } from './sequenceLayout';

/**
 * One transaction as a sequence diagram: units are lifelines, operators are the
 * messages between them, in kernel order. A filter that returned false is a
 * dashed arrow ending in ✕.
 */
export function SequenceView({ transaction }: { transaction: Tx }) {
  const store = useStore();
  const { texts } = store;
  const { actors, hiddenActorCount, messages } = buildSequence(store, transaction);
  const columnOf = new Map(actors.map((actor, index) => [actor, index]));
  const width = Math.max(1, actors.length) * COLUMN_WIDTH + 40;
  const height = HEADER_HEIGHT + messages.length * ROW_HEIGHT + 24;
  const centerX = (actor: string) => 20 + columnOf.get(actor)! * COLUMN_WIDTH + COLUMN_WIDTH / 2;
  return (
    <div className="seqwrap">
      {hiddenActorCount > 0 && (
        <div className="hint" style={{ padding: '4px 10px' }}>
          {texts.sequence.more(hiddenActorCount)}
        </div>
      )}
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={texts.sequence.title}
        className="seq"
      >
        <defs>
          <marker
            id="sqa"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" className="sqm" />
          </marker>
        </defs>
        {actors.map((actor) => (
          <SequenceLifeline
            key={actor}
            actor={actor}
            centerX={centerX(actor)}
            diagramHeight={height}
          />
        ))}
        {messages.map((message, row) => (
          <SequenceArrow
            key={message.stepIndex}
            message={message}
            fromX={message.from === null ? OUTSIDE_X : centerX(message.from)}
            toX={centerX(message.to)}
            y={HEADER_HEIGHT + row * ROW_HEIGHT + 10}
          />
        ))}
      </svg>
    </div>
  );
}
