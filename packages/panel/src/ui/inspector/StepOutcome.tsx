import { preview, type Step } from '@deffector/protocol';
import { ValuePreview } from '../common';

/** What a step did: the store change, the error, the stopped filter, the effect call or the value. */
export function StepOutcome({ step }: { step: Step }) {
  if (step.status === 'changed' || (step.prev !== undefined && step.status !== 'same'))
    return (
      <>
        <ValuePreview value={step.prev} maxLength={30} /> →{' '}
        <ValuePreview value={step.value} maxLength={40} />
      </>
    );
  if (step.status === 'error') return <>{preview(step.error!, 80)}</>;
  if (step.status === 'filtered') return <>✕ filter = false</>;
  if (step.status === 'call')
    return (
      <>
        call #{step.fxId} <ValuePreview value={step.value} maxLength={40} />
      </>
    );
  return <ValuePreview value={step.value} maxLength={60} />;
}
