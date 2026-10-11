import { createEvent, createStore, sample } from 'effector';
import { declaredAt } from './declaredAt';

/** Runaway loop through events only: one call never ends, deffector stops it. */
export const loopStart = createEvent<number>({
  name: 'loopStart',
  sid: 'loopStart',
  ...declaredAt('src/lab/loop.ts', 5),
});
export const loopNext = createEvent<number>({
  name: 'loopNext',
  sid: 'loopNext',
  ...declaredAt('src/lab/loop.ts', 10),
});
export const $loopCount = createStore(0, {
  name: '$loopCount',
  sid: 'loopCount',
  ...declaredAt('src/lab/loop.ts', 15),
}).on(loopNext, (_, count) => count);

// no filter: one call never ends
sample({ clock: loopStart, target: loopNext });
sample({ clock: loopNext, fn: (count) => count + 1, target: loopStart });
