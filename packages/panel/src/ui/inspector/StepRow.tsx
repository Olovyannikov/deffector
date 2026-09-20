import type { Step } from '@deffector/protocol';
import { Glyph, glyphClass, useStore } from '../common';
import { StepOutcome } from './StepOutcome';
import { StepUnitName } from './StepUnitName';

/** Indentation stops growing past this depth: deep chains stay readable. */
const MAX_INDENT_DEPTH = 8;

export function StepRow({ step, depth }: { step: Step; depth: number }) {
  const store = useStore();
  const unit = store.units.get(step.node);
  return (
    <div
      className={`step st-${step.status}${step.internal ? ' st-internal' : ''}`}
      style={{ paddingLeft: 10 + Math.min(depth, MAX_INDENT_DEPTH) * 10 }}
    >
      <span className="lane">{step.lane}</span>
      <Glyph glyph={glyphClass(unit)} />
      <StepUnitName unit={unit} node={step.node} />
      <span className="s-t">
        <StepOutcome step={step} />
        {step.note && <span className="s-note">{step.note}</span>}
      </span>
    </div>
  );
}
