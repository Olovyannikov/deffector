import { createEvent, createStore } from 'effector';
import { declaredAt } from './declaredAt';

/** Noisy polling: a candidate for an ignore rule in the panel's saved filters. */
export const pollTick = createEvent<number>({
  name: 'pollTick',
  sid: 'pollTick',
  ...declaredAt('src/lab/poll.ts', 5),
});
export const $polled = createStore(0, {
  name: '$polled',
  sid: 'polled',
  ...declaredAt('src/lab/poll.ts', 10),
}).on(pollTick, (_, value) => value);
