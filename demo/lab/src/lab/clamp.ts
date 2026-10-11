import { createEvent, createStore, sample } from 'effector';
import { declaredAt } from './declaredAt';

/** A cycle through a store that converges: values above 100 are written back as 100. */
export const clamp = createEvent<number>({
  name: 'clamp',
  sid: 'clamp',
  ...declaredAt('src/lab/clamp.ts', 5),
});
export const $clamped = createStore(0, {
  name: '$clamped',
  sid: 'clamped',
  ...declaredAt('src/lab/clamp.ts', 10),
}).on(clamp, (_, value) => value);

sample({ clock: $clamped, filter: (value) => value > 100, fn: () => 100, target: clamp });
