export default function ErrorState({ message, onRetry }) {
  return (
    <div className="panel error-state" role="alert">
      <p className="error-state__message">{message || "Something went wrong."}</p>
      {onRetry && (
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
