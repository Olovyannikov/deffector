import type { Diagnostic } from '@deffector/protocol';
import type { Texts } from '../i18n';
import type { Registry } from '../registry';
import type { Scopes } from '../scopes';
import { joinFirst, type UnitLabels } from './unitLabels';

/** Writable stores without a sid: serialize skips them and traces match them by name only. */
export function checkMissingSids(registry: Registry, texts: Texts): Diagnostic | undefined {
  const writable = [...registry.units.values()].filter(
    (record) => record.info.writable && !record.info.internal,
  );
  const withoutSid = writable.filter((record) => !record.info.sid);
  if (!withoutSid.length) return undefined;
  const names = joinFirst(
    withoutSid.map((record) => record.info.name),
    5,
  );
  return {
    id: 'static:no-sid',
    level: 'warning',
    code: 'no-sid',
    count: withoutSid.length,
    node: withoutSid[0].info.id,
    file: withoutSid[0].info.file,
    title: texts.noSidTitle(withoutSid.length, writable.length),
    detail: texts.noSidDetail(names),
    fix: texts.noSidFix,
  };
}

/** Units created again after start share a sid too: that is reported as a leak, not here. */
function isRecreatedAfterStart(registry: Registry, sid: string, ids: string[]): boolean {
  return ids
    .slice(1)
    .every(
      (id) =>
        (registry.get(id)?.info.createdAt ?? 0) > 0 &&
        registry.creationsByLocation.get(sid)?.lateCount,
    );
}

export function checkDuplicateSids(
  registry: Registry,
  labels: UnitLabels,
  texts: Texts,
): Diagnostic[] {
  const idsBySid = new Map<string, string[]>();
  for (const record of registry.units.values()) {
    if (!record.info.sid || record.info.internal) continue;
    const ids = idsBySid.get(record.info.sid) || [];
    ids.push(record.info.id);
    idsBySid.set(record.info.sid, ids);
  }
  const duplicates: Diagnostic[] = [];
  for (const [sid, ids] of idsBySid) {
    if (ids.length < 2 || isRecreatedAfterStart(registry, sid, ids)) continue;
    duplicates.push({
      id: `static:dup:${sid}`,
      level: 'error',
      code: 'duplicate-sid',
      count: ids.length,
      node: ids[0],
      title: texts.dupTitle(sid),
      detail: texts.dupDetail(ids.map((id) => labels.name(id)).join(', ')),
      fix: texts.dupFix,
    });
  }
  return duplicates;
}

/** Values hydrated from the server for sids this client does not have. */
export function checkUnknownServerSids(
  registry: Registry,
  scopes: Scopes,
  texts: Texts,
): Diagnostic | undefined {
  const knownSids = new Set<string>();
  for (const record of registry.units.values()) {
    if (record.info.sid) knownSids.add(record.info.sid);
  }
  const unknownSids = new Set<string>();
  for (const { scope } of scopes.knownScopes()) {
    const sidMap = scope.values && scope.values.sidMap;
    if (!sidMap) continue;
    for (const sid of Object.keys(sidMap)) if (!knownSids.has(sid)) unknownSids.add(sid);
  }
  if (!unknownSids.size) return undefined;
  const list = [...unknownSids];
  return {
    id: 'static:sid-mismatch',
    level: 'warning',
    code: 'sid-mismatch',
    count: list.length,
    title: texts.sidMismatchTitle(list.length),
    detail: texts.sidMismatchDetail(joinFirst(list, 6)),
    fix: texts.sidMismatchFix,
  };
}
