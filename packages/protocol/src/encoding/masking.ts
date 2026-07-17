/** Object keys whose string values are secrets by default: passwords, tokens, card data. */
export const DEFAULT_MASK =
  /pass(word)?|passwd|secret|token|authorization|cookie|api[-_]?key|cvv|card/i;

export function maskByKey(key: string): boolean {
  return DEFAULT_MASK.test(key);
}

/** Replace every character with a bullet, keeping the length (validation keeps working on replay). */
export function maskString(secret: string): string {
  return '•'.repeat(secret.length);
}
