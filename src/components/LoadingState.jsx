export default function LoadingState({ slow, streamedChars = 0 }) {
  return (
    <div className="panel loading-state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      {streamedChars > 0 && <p className="hint">Receiving response: {streamedChars} characters streamed. Checking structure before display.</p>}
      <p>{slow ? "Still working — this one's taking longer than usual." : "Generating your study set…"}</p>
    </div>
  );
}
