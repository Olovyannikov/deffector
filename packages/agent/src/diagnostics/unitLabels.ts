import type { Registry } from '../registry';

/** How diagnostics refer to units: by name, and by the place in the source. */
export class UnitLabels {
  constructor(private readonly registry: Registry) {}

  name(id: string): string {
    return this.registry.get(id)?.info.name ?? id;
  }

  location(id: string): string | undefined {
    const info = this.registry.get(id)?.info;
    if (!info?.file) return undefined;
    return info.file + (info.line ? `:${info.line}` : '');
  }
}

/** The first `max` items joined, with an ellipsis when some are left out. */
export function joinFirst(items: string[], max: number, separator = ', ', ellipsis = '…'): string {
  return items.slice(0, max).join(separator) + (items.length > max ? ellipsis : '');
}
