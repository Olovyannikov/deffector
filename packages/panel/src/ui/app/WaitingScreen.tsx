import { useStore } from '../common';

/** Shown until an agent says hello: how to add it to the app. */
export function WaitingScreen() {
  const { texts } = useStore();
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
