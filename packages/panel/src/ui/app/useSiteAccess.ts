import { useEffect, useState } from 'react';
import type { SiteAccess, SiteAccessStatus } from '../../store';

/** How often the waiting screen re-checks access: the user may grant it in another window. */
const RECHECK_INTERVAL_MS = 2000;

/** The inspected site's access status while the panel waits for an agent; null when unknown. */
export function useSiteAccess(siteAccess: SiteAccess | null): SiteAccessStatus | null {
  const [status, setStatus] = useState<SiteAccessStatus | null>(null);
  useEffect(() => {
    if (!siteAccess) return undefined;
    let cancelled = false;
    const check = () => {
      siteAccess.check().then(
        (next) => {
          if (!cancelled) setStatus(next);
        },
        () => {
          if (!cancelled) setStatus(null);
        },
      );
    };
    check();
    const timer = setInterval(check, RECHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [siteAccess]);
  return status;
}
