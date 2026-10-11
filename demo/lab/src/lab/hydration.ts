/**
 * Values "from the server" for `?hydrate`: `price` has a store on the client,
 * the other sids do not, so Health reports a hydration mismatch.
 */
export const serverValues = {
  price: 12,
  'server-only-sid': 'from the server',
  'another-missing': 1,
};
