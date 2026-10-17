/** The match pattern deffector asks for to run on `origin`: the whole host, any port and path. */
export function originPattern(origin: string): string | null {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    return `${protocol}//${hostname}/*`;
  } catch {
    return null;
  }
}
