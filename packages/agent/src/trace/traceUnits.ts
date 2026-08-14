import type { TraceUnit } from '@deffector/protocol';
import type { UnitRecord } from '../registry';

/** Units the trace refers to, keyed by their id on this page. */
export class TraceUnits {
  private readonly units = new Map<string, TraceUnit>();

  add(record: UnitRecord) {
    const { info } = record;
    if (this.units.has(info.id)) return;
    this.units.set(info.id, {
      ref: info.id,
      name: info.name,
      kind: info.kind,
      sid: info.sid,
      file: info.file,
      derived: info.derived || undefined,
    });
  }

  list(): TraceUnit[] {
    return [...this.units.values()];
  }
}
