import type { Tx } from '@deffector/protocol';
import { useStore, withStableKeys } from '../common';
import { stepDepths } from './stepDepths';
import { StepRow } from './StepRow';
import { whyExplanations } from './whyExplanations';

/** Explanations of the transaction, then its steps in kernel order, indented by who pushed whom. */
export function WhyTab({ transaction }: { transaction: Tx }) {
  const store = useStore();
  const depths = stepDepths(transaction.steps);
  const steps = transaction.steps.filter((step) => store.ui.showInternal || !step.internal);
  const explanations = withStableKeys(
    whyExplanations(store, transaction),
    (explanation) => explanation.text,
  );
  return (
    <>
      {explanations.map(({ key, item: explanation }) => (
        <div key={key} className={`why ${explanation.tone}`}>
          {explanation.text}
        </div>
      ))}
      {steps.map((step) => (
        <StepRow key={step.i} step={step} depth={depths.get(step.i) ?? 0} />
      ))}
    </>
  );
}
