import { useStore } from '../common';
import { PastBanner } from './PastBanner';

/** Replay progress, the past, an applied trace, and the global-mode warning. */
export function TimelineBanners() {
  const store = useStore();
  const { texts, timeline } = store;
  const isGlobalMode = store.diagnostics.some((diagnostic) => diagnostic.code === 'global-mode');
  return (
    <>
      {timeline.mode === 'replay' && timeline.replay && (
        <div className="banner" role="status">
          <b>{texts.replaying(timeline.replay.i, timeline.replay.total, timeline.replay.label)}</b>
          <span className="hint">{texts.replayingSub}</span>
        </div>
      )}
      {timeline.mode === 'past' && timeline.cursor !== null && (
        <PastBanner cursor={timeline.cursor} />
      )}
      {timeline.mode === 'live' && timeline.readOnlyLabel && (
        <div className="banner" role="status">
          <b>{texts.readOnly(timeline.readOnlyLabel)}</b>
        </div>
      )}
      {isGlobalMode && timeline.mode !== 'live' && timeline.strategy === 'in-place' && (
        <div className="banner warn" role="alert">
          {texts.globalBanner}
        </div>
      )}
    </>
  );
}
