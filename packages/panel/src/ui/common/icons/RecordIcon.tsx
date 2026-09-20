/** The record button's dot: filled while recording. */
export function RecordIcon({ isRecording }: { isRecording: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="ic" aria-hidden="true">
      <circle cx="8" cy="8" r="4.5" className={isRecording ? 'fillc' : ''} />
    </svg>
  );
}
