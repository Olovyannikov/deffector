import { it, expect } from 'vitest';
import * as effector from 'effector';
import { createEvent, sample } from 'effector';
import { createMemoryTransportPair } from '@deffector/protocol';
import { Agent } from '../src/agent';
import { asInternalScope } from '../src/effector';

/** effector with the upstream changes exports setStepBudget */
const hasUpstreamChanges =
  typeof (effector as unknown as Record<string, unknown>).setStepBudget === 'function';

// Only meaningful with vitest.upstream.config.ts: effector with the upstream changes
it.runIf(hasUpstreamChanges)('uses kernel skip and caller from upstream effector', async () => {
  const agent = new Agent({ name: 'up' });
  const pair = createMemoryTransportPair();
  agent.connect(pair.agent);
  pair.panel.send({ type: 'connect' });
  const outer = createEvent({ name: 'outerUp' });
  const inner = createEvent({ name: 'innerUp' });
  outer.watch(() => inner());
  const target = createEvent<number>({ name: 'targetUp' });
  sample({ clock: inner, filter: () => false, fn: () => 1, target });
  outer();
  await new Promise((resolve) => {
    setTimeout(resolve, 20);
  });
  const { transactions } = agent.history;
  const nameOf = (id: string) => agent.registry.get(id)?.info.name;
  const innerTx = transactions.find((transaction) => nameOf(transaction.root.id) === 'innerUp')!;
  const outerTx = transactions.find((transaction) => nameOf(transaction.root.id) === 'outerUp')!;
  expect(innerTx.cause).toMatchObject({ kind: 'nested', txId: outerTx.id });
  expect(innerTx.flags.blocked?.length).toBe(1);
  // fork({ name }) comes with the upstream changes: the public type does not have it yet
  const forkWithName = effector.fork as (config: { name: string }) => effector.Scope;
  const named = forkWithName({ name: 'from-fork-name' });
  agent.scopes.idOf(asInternalScope(named));
  expect(agent.scopes.list().some((scope) => scope.name === 'from-fork-name')).toBe(true);
});
