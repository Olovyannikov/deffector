import type { UnitInfo } from '@deffector/protocol';

export type GlyphSource = Pick<UnitInfo, 'kind' | 'derived' | 'internal'>;

/**
 * CSS modifier of the small coloured mark before a unit name. Without a unit it marks an operator,
 * or a deffector edit when `isDevtoolsEdit`.
 */
export function glyphClass(unit: GlyphSource | undefined, isDevtoolsEdit = false): string {
  if (!unit) return isDevtoolsEdit ? 'g-edit' : 'g-op';
  if (unit.internal && unit.kind !== 'store') return 'g-int';
  switch (unit.kind) {
    case 'store':
      return unit.derived ? 'g-derived' : 'g-store';
    case 'event':
      return 'g-event';
    case 'effect':
    case 'fx':
      return 'g-effect';
    case 'domain':
      return 'g-domain';
    default:
      return 'g-op';
  }
}
