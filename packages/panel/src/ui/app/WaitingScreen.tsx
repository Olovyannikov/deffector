import { useStore } from '../common';
import { useSiteAccess } from './useSiteAccess';

/** Shown until an agent says hello: how to add it to the app, or how to allow the site. */
export function WaitingScreen() {
  const store = useStore();
  const { texts, siteAccess } = store;
  const access = useSiteAccess(siteAccess);
  if (siteAccess && access && !access.granted) {
    const { host } = new URL(access.origin);
    return (
      <div className="body">
        <div className="empty" style={{ margin: 'auto' }} role="status">
          <b>{texts.siteAccessTitle(host)}</b>
          {texts.siteAccessText}
          <br />
          <br />
          <button
            type="button"
            className="btn pri"
            onClick={() => siteAccess.request(access.origin)}
          >
            {texts.siteAccessButton}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="body">
      <div className="empty" style={{ margin: 'auto' }} role="status">
        <b>{texts.waitingTitle}</b>
        {texts.waitingText}
        <br />
        <pre>{texts.waitingCode}</pre>
        <br />
        <span className="hint">{texts.waitingHint}</span>
      </div>
    </div>
  );
}
