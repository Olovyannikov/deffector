import { createEffect, createEvent, createStore, scopeBind } from 'effector';
import { declaredAt } from './declaredAt';

const TICKS_PER_START = 3;

/** A timer that calls an event: without scopeBind the ticks leave the app's scope. */
export const tick = createEvent({
  name: 'tick',
  sid: 'tick',
  ...declaredAt('src/lab/timer.ts', 7),
});
export const $ticks = createStore(0, {
  name: '$ticks',
  sid: 'ticks',
  ...declaredAt('src/lab/timer.ts', 12),
}).on(tick, (ticks) => ticks + 1);
export const startTimerFx = createEffect({
  name: 'startTimerFx',
  sid: 'startTimerFx',
  ...declaredAt('src/lab/timer.ts', 17),
  handler: (isBound: boolean) => {
    const fireTick = isBound ? scopeBind(tick, { safe: true }) : tick;
    let fired = 0;
    const intervalId = setInterval(() => {
      fireTick();
      fired += 1;
      if (fired >= TICKS_PER_START) clearInterval(intervalId);
    }, 150);
  },
});
