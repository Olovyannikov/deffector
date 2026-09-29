import type { Tx } from '@deffector/protocol';
import { createVersionedSelector, type PanelStore } from '../../store';

/** Order in which a transaction first reached each unit (helpers count as their owner), from 1. */
export const selectStepOrder = createVersionedSelector(
  (store: PanelStore, transaction: Tx): Map<string, number> => {
    const order = new Map<string, number>();
    for (const step of transaction.steps) {
      const unit = store.units.get(step.node);
      const id = unit?.internal && unit.ownerId ? unit.ownerId : step.node;
      if (!order.has(id)) order.set(id, order.size + 1);
    }
    return order;
  },
);
