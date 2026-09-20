/** Agent time (ms since the agent started) as seconds with two decimals: `12.34`. */
export function formatSeconds(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(2);
}
