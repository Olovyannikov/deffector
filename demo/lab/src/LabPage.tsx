import type { Scope } from 'effector';
import { BigGraphCard, EffectsCard, GlitchesCard, LeaksAndNoiseCard, RunawayCard } from './cards';

export function LabPage({ scope, withAgent }: { scope: Scope; withAgent: boolean }) {
  return (
    <main>
      <h1>deffector lab {withAgent ? '' : '(no agent)'}</h1>
      <BigGraphCard scope={scope} />
      <RunawayCard />
      <GlitchesCard />
      <EffectsCard />
      <LeaksAndNoiseCard />
    </main>
  );
}
