import { PROTOCOL_VERSION, type HelloInfo } from '@deffector/protocol';
import { effectorVersion } from '../effector';
import { pageUrl } from '../platform';
import type { Registry } from '../registry';
import { AGENT_VERSION, type AppInfo } from './options';

/** Who is there: the panel shows it and decides whether to (re)send `connect`. */
export function buildHelloInfo(registry: Registry, app: AppInfo, instance: string): HelloInfo {
  const writable = [...registry.units.values()].filter(
    (record) => record.info.writable && !record.info.internal,
  );
  return {
    protocol: PROTOCOL_VERSION,
    instance,
    agent: { version: AGENT_VERSION },
    effector: { version: effectorVersion },
    app: { ...app, url: pageUrl() ?? app.url },
    mode: 'deep',
    sidCoverage: {
      withSid: writable.filter((record) => record.info.sid).length,
      total: writable.length,
    },
  };
}
