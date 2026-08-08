import type { Diagnostic } from '@deffector/protocol';
import type { Texts } from '../i18n';
import type { Registry } from '../registry';

/** creations after start from one location that make it a leak */
const LEAK_THRESHOLD = 3;

const LATE_FILES_SHOWN = 4;

/**
 * The same source location creating units again and again after start is a
 * leak; units created late at all (lazy chunks) are only worth an info.
 */
export function checkUnitLeaks(registry: Registry, texts: Texts): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  let lateTotal = 0;
  const lateByFile = new Map<string, number>();
  for (const [location, creations] of registry.creationsByLocation) {
    if (!creations.lateCount) continue;
    const first = registry.get(creations.unitIds[0])?.info;
    lateTotal += creations.lateCount;
    const file = first?.file || location;
    lateByFile.set(file, (lateByFile.get(file) || 0) + creations.lateCount);
    if (creations.count < LEAK_THRESHOLD) continue;
    const name = first?.name ?? location;
    const where = first?.file ? `${first.file}${first.line ? `:${first.line}` : ''}` : location;
    diagnostics.push({
      id: `static:leak:${location}`,
      level: 'warning',
      code: 'unit-leak',
      count: creations.count,
      node: creations.unitIds[creations.unitIds.length - 1],
      file: where,
      title: texts.leakTitle(name, creations.count),
      detail: texts.leakDetail(where),
      fix: texts.leakFix,
    });
  }
  if (lateTotal) {
    const files = [...lateByFile]
      .sort((a, b) => b[1] - a[1])
      .slice(0, LATE_FILES_SHOWN)
      .map(([file, count]) => `${file} ×${count}`)
      .join(', ');
    diagnostics.push({
      id: 'static:late',
      level: 'info',
      code: 'late-units',
      count: lateTotal,
      title: texts.lateTitle(lateTotal),
      detail: texts.lateDetail(files),
    });
  }
  return diagnostics;
}
