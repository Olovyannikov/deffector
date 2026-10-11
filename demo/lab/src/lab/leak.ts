import { createStore } from 'effector';
import { declaredAt } from './declaredAt';

/** Creates a store on every call, like a model created inside a component. */
export function createLeakyModel() {
  return createStore(0, {
    name: '$leaky',
    sid: 'leaky',
    ...declaredAt('src/lab/leak.ts', 6),
  });
}
