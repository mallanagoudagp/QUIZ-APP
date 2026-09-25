import { useState } from "react";

export default function AuthPanel({
  onSignIn,
  onSignUp,
  onResetPassword,
  onUpdatePassword,
  recoveryRequested,
  onDismiss
}) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const signingUp = mode === "signup";
  const changingPassword = recoveryRequested;
  const title = changingPassword
    ? "Set a new password"
    : resetMode
      ? "Reset your password"
      : signingUp
        ? "Create your account"
        : "Welcome back";

  async function submit(event) {
    event.preventDefault();
    setError(null);
    if ((signingUp || changingPassword) && password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSending(true);
    try {
      if (changingPassword) {
        await onUpdatePassword(password);
        onDismiss();
      } else if (resetMode) {
        await onResetPassword(email);
        setResetSent(true);
      } else if (signingUp) {
        const result = await onSignUp(email, password);
        if (result?.needsConfirmation) {
          setConfirmationSent(true);
          return;
        }
        onDismiss();
      } else {
        await onSignIn(email, password);
        onDismiss();
      }
    } catch (authError) {
      setError(authError.message || "Couldn't authenticate with that email and password.");
    } finally {
      setSending(false);
    }
  }

  if (confirmationSent || resetSent) {
    return (
      <section className="auth-panel auth-panel--message" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="auth-panel__brand" aria-hidden="true">R</div>
        <p className="auth-panel__eyebrow">RECALL ACCOUNT</p>
        <h2 id="auth-title">{confirmationSent ? "Check your email" : "Check your inbox"}</h2>
        <p className="auth-panel__intro">
          {confirmationSent
            ? <>For a new account, check <strong>{email}</strong> for a confirmation email, including your spam folder. If this address already has a Supabase account, another confirmation may not be sent. Return to sign in and choose <strong>Forgot password?</strong> to set or reset its password.</>
            : <>If an account exists for <strong>{email}</strong>, Supabase will try to send a password reset email. Check your inbox and spam folder; this screen can’t confirm delivery.</>}
        </p>
        {confirmationSent ? (
          <button type="button" className="button button--primary auth-panel__submit" onClick={() => {
            setConfirmationSent(false);
            setMode("signin");
            setPassword("");
            setConfirmPassword("");
          }}>
            Back to sign in
          </button>
        ) : (
          <button type="button" className="button button--primary auth-panel__submit" onClick={onDismiss}>Done</button>
        )}
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="auth-panel" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="auth-panel__topline">
        <div className="auth-panel__brand" aria-hidden="true">R</div>
        <button type="button" className="auth-panel__close" onClick={onDismiss} aria-label="Close sign in">×</button>
      </div>
      <p className="auth-panel__eyebrow">RECALL ACCOUNT</p>
      <h2 id="auth-title">{title}</h2>
      <p className="auth-panel__intro">
        {changingPassword
          ? "Choose a new password for your Recall account."
          : resetMode
            ? "Enter your email and we’ll send a secure password reset link."
            : signingUp
              ? "Create an account to keep your study progress synced across devices."
              : "Sign in to continue learning with your saved progress."}
      </p>

      {!changingPassword && !resetMode && <div className="auth-panel__field">
        <label htmlFor="auth-email">Email address</label>
        <input
          id="auth-email"
          className="auth-panel__input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>}

      {resetMode && <div className="auth-panel__field">
        <label htmlFor="auth-email">Email address</label>
        <input
          id="auth-email"
          className="auth-panel__input"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </div>}

      {!resetMode && <div className="auth-panel__field">
        <label htmlFor="auth-password">{changingPassword ? "New password" : "Password"}</label>
        <input
          id="auth-password"
          className="auth-panel__input"
          type="password"
          autoComplete={signingUp || changingPassword ? "new-password" : "current-password"}
          minLength={signingUp || changingPassword ? 8 : undefined}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={signingUp || changingPassword ? "At least 8 characters" : "Enter your password"}
        />
      </div>}

      {(signingUp || changingPassword) && <div className="auth-panel__field">
        <label htmlFor="auth-confirm-password">Confirm password</label>
        <input
          id="auth-confirm-password"
          className="auth-panel__input"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Enter your password again"
        />
      </div>}

      <button type="submit" className="button button--primary auth-panel__submit" disabled={sending}>
        {sending
          ? "Please wait…"
          : changingPassword
            ? "Update password"
            : resetMode
              ? "Send reset link"
              : signingUp
                ? "Create account"
                : "Sign in"}
      </button>
      {error && <p className="auth-panel__error" role="alert">{error}</p>}

      {!signingUp && !resetMode && !changingPassword && <button
        type="button"
        className="auth-panel__text-button"
        onClick={() => { setError(null); setResetMode(true); }}
      >Forgot password?</button>}

      {!resetMode && !changingPassword && <div className="auth-panel__footer">
        <p>
          {signingUp ? "Already have an account?" : "New to Recall?"}{" "}
          <button type="button" className="auth-panel__text-button" onClick={() => {
            setError(null);
            setPassword("");
            setConfirmPassword("");
            setMode(signingUp ? "signin" : "signup");
          }}>
            {signingUp ? "Sign in" : "Create an account"}
          </button>
        </p>
        <p>Prefer not to sign in? <button type="button" className="auth-panel__text-button" onClick={onDismiss}>Continue as guest</button></p>
      </div>}

      {resetMode && <button type="button" className="auth-panel__text-button" onClick={() => {
        setError(null);
        setResetMode(false);
      }}>Back to sign in</button>}
    </form>
  );
}
