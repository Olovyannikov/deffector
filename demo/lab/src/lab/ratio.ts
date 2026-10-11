import { createEvent, createStore } from 'effector';
import { declaredAt } from './declaredAt';

/** An exception in a derived store: a divisor of 0 throws inside .map. */
export const ratioSet = createEvent<number>({
  name: 'ratioSet',
  sid: 'ratioSet',
  ...declaredAt('src/lab/ratio.ts', 5),
});
export const $divisor = createStore(2, {
  name: '$divisor',
  sid: 'divisor',
  ...declaredAt('src/lab/ratio.ts', 10),
}).on(ratioSet, (_, divisor) => divisor);
export const $ratio = $divisor.map((divisor) => {
  if (divisor === 0) throw new Error('division by zero');
  return Math.round(100 / divisor);
});
export const $ratioLabel = $ratio.map((ratio) => `${ratio}%`);
