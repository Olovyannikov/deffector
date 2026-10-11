import { createEffect, createEvent, createStore, sample } from 'effector';
import { declaredAt } from './declaredAt';

const WORDS = ['alpha', 'beta', 'gamma', 'delta'];

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** A slow effect with random latency: overrides and out-of-order responses. */
export const search = createEvent<string>({
  name: 'search',
  sid: 'search',
  ...declaredAt('src/lab/search.ts', 12),
});
export const searchFx = createEffect<string, string[]>({
  name: 'searchFx',
  sid: 'searchFx',
  ...declaredAt('src/lab/search.ts', 17),
  handler: async (query) => {
    await wait(400 + Math.random() * 600);
    return WORDS.filter((word) => word.includes(query.toLowerCase()));
  },
});
export const $results = createStore<string[]>([], {
  name: '$results',
  sid: 'results',
  ...declaredAt('src/lab/search.ts', 26),
}).on(searchFx.doneData, (_, results) => results);
export const $searchError = createStore('', {
  name: '$searchError',
  sid: 'searchError',
  ...declaredAt('src/lab/search.ts', 31),
})
  // an override in the panel can reject with any value, not only an Error
  .on(searchFx.failData, (_, error) => String(error?.message ?? error))
  .reset(searchFx);

sample({ clock: search, target: searchFx });
