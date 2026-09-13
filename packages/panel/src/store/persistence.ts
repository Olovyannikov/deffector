/** Presets and saved filters are kept per app in the panel's localStorage and survive reloads. */
export function appStorageKey(kind: 'presets' | 'filters', appName: string | undefined): string {
  return `deffector:${kind}:${appName || 'app'}`;
}

export function readStoredList<Item>(key: string): Item[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Item[]) : [];
  } catch {
    return [];
  }
}

export function writeStoredList(key: string, list: readonly unknown[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // private mode: the list lives until the panel is closed
  }
}
