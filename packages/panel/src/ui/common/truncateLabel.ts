/** Cuts text longer than `maxLength` to fit, ending it with an ellipsis. */
export function truncateLabel(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
