import { createEvent, createStore, sample } from 'effector';
import { declaredAt } from './declaredAt';

/** A glitch: a sample reads $qty before a later sample of the same transaction updates it. */
export const priceChanged = createEvent<number>({
  name: 'priceChanged',
  sid: 'priceChanged',
  ...declaredAt('src/lab/cart.ts', 5),
});
export const $price = createStore(10, {
  name: '$price',
  sid: 'price',
  ...declaredAt('src/lab/cart.ts', 10),
});
export const $qty = createStore(1, {
  name: '$qty',
  sid: 'qty',
  ...declaredAt('src/lab/cart.ts', 15),
});
export const totalLogged = createEvent<number>({
  name: 'totalLogged',
  sid: 'totalLogged',
  ...declaredAt('src/lab/cart.ts', 20),
});
export const $lastLogged = createStore(0, {
  name: '$lastLogged',
  sid: 'lastLogged',
  ...declaredAt('src/lab/cart.ts', 25),
}).on(totalLogged, (_, total) => total);

// reads $qty when $price changes, but $qty is updated by a later sample in the same transaction
sample({ clock: $price, source: $qty, fn: (qty, price) => qty * price, target: totalLogged });
sample({ clock: priceChanged, target: $price });
sample({ clock: priceChanged, fn: () => 3, target: $qty });
