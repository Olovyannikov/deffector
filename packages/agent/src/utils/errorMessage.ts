/** The message of an Error, or the thrown value itself as text. */
export function errorMessage(error: unknown): string {
  const message = (error as { message?: unknown } | null | undefined)?.message;
  return String(message ?? error);
}
