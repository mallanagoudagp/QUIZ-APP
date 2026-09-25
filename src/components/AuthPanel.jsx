import { useState } from "react";

export default function AuthPanel({ onSignIn, onDismiss }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await onSignIn(email);
      setSent(true);
    } catch (err) {
      setError(err.message || "Couldn't send the sign-in link.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="panel auth-panel">
        <h3 style={{ margin: "0 0 8px 0" }}>Check your inbox</h3>
        <p style={{ margin: "0 0 12px 0" }}>
          We sent a magic sign-in link to <strong>{email}</strong>.
        </p>
        <p className="hint" style={{ margin: 0 }}>
          Click the link in your email to sign in, or{" "}
          <button type="button" className="linklike" onClick={onDismiss}>
            continue as guest
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="prompt-panel auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 id="auth-title" style={{ margin: 0, fontSize: "1.1rem" }}>Sign in</h3>
        <button
          type="button"
          className="linklike"
          onClick={onDismiss}
          style={{ fontSize: "0.9rem" }}
        >
          ✕ Close
        </button>
      </div>
      <p className="hint" style={{ margin: 0 }}>
        Sign in with your email to sync quiz accuracy, weak-spot tracking, and spaced reviews across your devices.
      </p>
      <div className="refine-row">
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <button type="submit" className="button button--primary" disabled={sending}>
          {sending ? "Sending…" : "Send Magic Link"}
        </button>
      </div>
      {error && <p className="error-state__message">{error}</p>}
      <p className="hint" style={{ margin: 0 }}>
        No password required. Or{" "}
        <button type="button" className="linklike" onClick={onDismiss}>
          continue in guest mode
        </button>{" "}
        — your study progress stays saved locally on this browser.
      </p>
    </form>
  );
}
