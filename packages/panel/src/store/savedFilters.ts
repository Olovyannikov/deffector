import { appStorageKey, readStoredList, writeStoredList } from './persistence';
import type { PanelStore } from './PanelStore';

/** A filter saved by the user: applied in one click, highlights rows, or drops matches at the source. */
export interface SavedFilter {
  id: string;
  name: string;
  pattern: string;
  color: string;
  highlight: boolean;
  /** not recorded by the agent at all (kept only for state snapshots) */
  drop: boolean;
}

export const FILTER_COLORS = [
  '#F28B82',
  '#FDD663',
  '#81C995',
  '#78D9EC',
  '#A8C7FA',
  '#C58AF9',
  '#FF8BCB',
];

/** The colour after `color` in the palette, for the swatch that cycles through them. */
export function nextFilterColor(color: string): string {
  return FILTER_COLORS[(FILTER_COLORS.indexOf(color) + 1) % FILTER_COLORS.length];
}

function compilePattern(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern, 'i');
  } catch {
    return null;
  }
}

export class SavedFilterList {
  items: SavedFilter[] = [];

  /** compiled patterns: highlighting runs for every visible log row */
  private patternCache = new Map<string, RegExp | null>();

  constructor(private readonly store: PanelStore) {}

  private get storageKey() {
    return appStorageKey('filters', this.store.hello?.app.name);
  }

  load() {
    this.items = readStoredList<SavedFilter>(this.storageKey);
  }

  add(name: string, pattern: string) {
    if (!pattern) return;
    this.items = [
      ...this.items,
      {
        id: Math.random().toString(36).slice(2, 8),
        name: name || pattern,
        pattern,
        color: FILTER_COLORS[this.items.length % FILTER_COLORS.length],
        highlight: true,
        drop: false,
      },
    ];
    this.persist();
  }

  update(id: string, patch: Partial<SavedFilter>) {
    this.items = this.items.map((filter) => (filter.id === id ? { ...filter, ...patch } : filter));
    this.persist();
  }

  remove(id: string) {
    this.items = this.items.filter((filter) => filter.id !== id);
    this.persist();
  }

  /** Tells the agent which transactions not to record ("Do not record" filters). */
  sendIgnoreRules() {
    this.store.send({
      type: 'set-ignore',
      rules: this.items
        .filter((filter) => filter.drop && filter.pattern)
        .map((filter) => ({ pattern: filter.pattern })),
    });
  }

  /** Colour of the first highlighting filter that matches the label. */
  highlightColor(label: string): string | null {
    for (const filter of this.items) {
      if (!filter.highlight) continue;
      if (this.compiled(filter.pattern)?.test(label)) return filter.color;
    }
    return null;
  }

  private compiled(pattern: string): RegExp | null {
    let regex = this.patternCache.get(pattern);
    if (regex === undefined) {
      regex = compilePattern(pattern);
      this.patternCache.set(pattern, regex);
    }
    return regex;
  }

  private persist() {
    writeStoredList(this.storageKey, this.items);
    this.sendIgnoreRules();
    this.store.emit();
  }
}
