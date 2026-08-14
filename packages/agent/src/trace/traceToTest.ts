import type { Encoded, TraceEffectResult, TraceFile, TraceUnit } from '@deffector/protocol';

/** A unit name as a JavaScript identifier. */
function identifierOf(name: string): string {
  const identifier = name.replace(/[^A-Za-z0-9_$]/g, '_');
  return /^[A-Za-z_$]/.test(identifier) ? identifier : `_${identifier}`;
}

function literalOf(value: Encoded): string {
  return JSON.stringify(value);
}

/** Initial values worth writing into the test: empty and zero values are the usual defaults. */
function isMeaningful(value: Encoded): boolean {
  if (value === '' || value === null || value === false || value === 0) return false;
  return !(Array.isArray(value) && !value.length);
}

function isVoidParams(params: Encoded): boolean {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return false;
  return (params as { $t?: unknown }).$t === 'undef';
}

/** Imports of the test: unit names grouped by the module they come from. */
class TestImports {
  private readonly namesByModule = new Map<string, Set<string>>();

  constructor(private readonly unitsByRef: Map<string, TraceUnit>) {}

  add(ref: string) {
    const unit = this.unitsByRef.get(ref);
    if (!unit) return;
    const module = unit.file ? unit.file.replace(/\.(t|j)sx?$/, '') : '<model>';
    if (!this.namesByModule.has(module)) this.namesByModule.set(module, new Set());
    this.namesByModule.get(module)!.add(identifierOf(unit.name));
  }

  lines(): string[] {
    return [...this.namesByModule].map(([module, names]) => {
      const from = module.startsWith('<') ? '<path to model>' : `./${module}`;
      return `import { ${[...names].join(', ')} } from '${from}'`;
    });
  }
}

/** A vitest/jest test that reproduces the trace with fork + allSettled. */
export function traceToTest(trace: TraceFile): string {
  const unitsByRef = new Map(trace.units.map((unit) => [unit.ref, unit]));
  const nameOf = (ref: string) => identifierOf(unitsByRef.get(ref)?.name ?? ref);
  const imports = new TestImports(unitsByRef);
  const initialValues = Object.entries(trace.initial).filter(([, value]) => isMeaningful(value));
  for (const [ref] of initialValues) imports.add(ref);
  const resultsByEffect = new Map<string, TraceEffectResult[]>();
  for (const result of trace.effectResults) {
    if (!resultsByEffect.has(result.unit)) resultsByEffect.set(result.unit, []);
    resultsByEffect.get(result.unit)!.push(result);
    imports.add(result.unit);
  }
  for (const step of trace.steps) imports.add(step.unit);
  for (const step of trace.steps) {
    if (step.values) Object.keys(step.values).forEach((ref) => imports.add(ref));
  }

  const { meta } = trace;
  const lines: string[] = ["import { fork, allSettled } from 'effector'", ...imports.lines(), ''];
  lines.push(
    `// Recorded by deffector: ${meta.app}, ${meta.recordedAt}${meta.author ? `, ${meta.author}` : ''}`,
  );
  lines.push(`test('replays ${meta.app} trace', async () => {`);
  if (resultsByEffect.size) {
    lines.push('  const replies = {');
    for (const [ref, results] of resultsByEffect) {
      const replies = results.map((result) => ({ status: result.status, value: result.value }));
      lines.push(`    ${nameOf(ref)}: ${JSON.stringify(replies)},`);
    }
    lines.push('  }');
    lines.push('  const reply = (list: { status: string; value: unknown }[]) => () => {');
    lines.push('    const r = list.shift()!');
    lines.push(
      "    return r.status === 'done' ? Promise.resolve(r.value) : Promise.reject(r.value)",
    );
    lines.push('  }');
  }
  lines.push('  const scope = fork({');
  if (initialValues.length) {
    lines.push('    values: [');
    for (const [ref, value] of initialValues)
      lines.push(`      [${nameOf(ref)}, ${literalOf(value)}],`);
    lines.push('    ],');
  }
  if (resultsByEffect.size) {
    const handlers = [...resultsByEffect.keys()]
      .map((ref) => `[${nameOf(ref)}, reply(replies.${nameOf(ref)})]`)
      .join(', ');
    lines.push(`    handlers: [${handlers}],`);
  }
  lines.push('  })');
  for (const step of trace.steps) {
    const note = trace.notes.find((candidate) => candidate.step === step.n);
    if (note) lines.push(`  // ${note.text}`);
    if (step.values) {
      for (const [ref, value] of Object.entries(step.values)) {
        lines.push(
          `  await allSettled(${nameOf(ref)}, { scope, params: ${literalOf(value)} }) // devtools edit`,
        );
      }
      continue;
    }
    const params = isVoidParams(step.params) ? '' : `, params: ${literalOf(step.params)}`;
    lines.push(`  await allSettled(${nameOf(step.unit)}, { scope${params} })`);
  }
  lines.push('  // expect(scope.getState($store)).toEqual(...)');
  lines.push('})');
  return lines.join('\n');
}
