import { useEffect, useState } from "react";
import PromptInput from "./components/PromptInput";
import ResultView from "./components/ResultView";
import LoadingState from "./components/LoadingState";
import ErrorState from "./components/ErrorState";
import AuthPanel from "./components/AuthPanel";
import ReviewDue from "./components/ReviewDue";
import LearnerProgress from "./components/LearnerProgress";
import { useGenerate } from "./hooks/useGenerate";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";
import { useLearnerProfile } from "./hooks/useLearnerProfile";
import { useCloudSession } from "./hooks/useCloudSession";
import {
  loadSession,
  saveSession,
  exportSessionAsJson,
  importSessionFromFile
} from "./lib/storage";
import { validateResult } from "./lib/validateResult";

export default function App() {
  const { status, error, result, droppedCount, streamedChars, run, retry, setResult } = useGenerate();
  const auth = useSupabaseAuth();
  const profile = useLearnerProfile(auth.user);
  const cloudSession = useCloudSession(auth.user);
  const [dark, setDark] = useState(() => localStorage.getItem("recall.theme") === "dark");
  const [showAuth, setShowAuth] = useState(false);
  const [history, setHistory] = useState([]); // for refine undo
  const [reviewing, setReviewing] = useState(false);
  const [activeView, setActiveView] = useState("study");

  const learnerContext = profile.hasHistory ? profile.promptContext : undefined;

  function handleAnswer(block, wasCorrect) {
    profile.recordAnswer({
      ...block,
      subject: block.subject || result?.title || "Previously studied"
    }, wasCorrect);
  }

  // Restore last session on load.
  useEffect(() => {
    if (auth.loading || cloudSession.loading) return;
    const saved = cloudSession.cloudEnabled ? cloudSession.cloudSession : loadSession();
    if (saved) {
      const checked = validateResult(JSON.stringify(saved));
      if (checked.ok) setResult(checked.data);
      else console.error("Saved study session failed validation and was ignored.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, cloudSession.loading, cloudSession.cloudEnabled, cloudSession.cloudSession]);

  // Persist whenever the current result changes.
  useEffect(() => {
    if (auth.loading || cloudSession.loading) return;
    if (result) {
      saveSession(result);
      cloudSession.saveCloudSession(result);
    }
  }, [result, auth.loading, cloudSession.loading, cloudSession.saveCloudSession]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("recall.theme", dark ? "dark" : "light");
  }, [dark]);

  function handleGenerate(text, simulate) {
    setHistory([]);
    run({ prompt: text, learnerContext, simulate });
  }

  function handleFocusWeakSpots(simulate) {
    setHistory((h) => (result ? [...h, result] : h));
    run({
      prompt: "Focus on my weak spots",
      learnerContext: { ...learnerContext, focusWeak: true },
      simulate
    });
  }

  function handleRefine(instruction) {
    if (!result) return;
    setHistory((h) => [...h, result]);
    run({ refine: { previousResult: result, instruction }, learnerContext });
  }

  function undoRefine() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setResult(prev);
      return h.slice(0, -1);
    });
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importSessionFromFile(file);
      const checked = validateResult(JSON.stringify(data));
      if (!checked.ok) throw new Error("That file doesn't contain a valid Recall study set.");
      setResult(checked.data);
      setHistory([]);
    } catch (err) {
      alert(err.message);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1>Recall</h1>
          <p className="tagline">Turn your notes into flashcards, a quiz, and a summary.</p>
        </div>
        <div className="app__header-actions">
          {auth.enabled &&
            (auth.user ? (
              <span className="auth-status">
                <span className="auth-status__badge">● Cloud Sync</span>
                <span className="hint">{auth.user.email}</span>
                <button type="button" className="linklike" onClick={auth.signOut}>
                  Sign out
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="button"
                onClick={() => setShowAuth(true)}
                title="Sign in for cross-device sync and personalized study"
              >
                👤 Sign in
              </button>
            ))}
          <button
            type="button"
            className="button button--icon"
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle dark mode"
          >
            {dark ? "☀︎ Light" : "☾ Dark"}
          </button>
        </div>
      </header>

      <main className="app__main">
        {auth.enabled && !auth.user && showAuth && (
          <div className="auth-overlay" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowAuth(false);
          }}>
            <AuthPanel onSignIn={auth.signInWithEmail} onDismiss={() => setShowAuth(false)} />
          </div>
        )}

        <nav className="app-nav" aria-label="Main navigation">
          <button
            type="button"
            className={`app-nav__item ${activeView === "study" ? "app-nav__item--active" : ""}`}
            aria-current={activeView === "study" ? "page" : undefined}
            onClick={() => setActiveView("study")}
          >
            <span aria-hidden="true">✎</span> Study
          </button>
          <button
            type="button"
            className={`app-nav__item ${activeView === "progress" ? "app-nav__item--active" : ""}`}
            aria-current={activeView === "progress" ? "page" : undefined}
            onClick={() => setActiveView("progress")}
          >
            <span aria-hidden="true">▥</span> Your progress
            {profile.hasHistory && <span className="app-nav__count">{Object.keys(profile.topics).length}</span>}
          </button>
        </nav>

        {activeView === "progress" ? (
          <LearnerProgress
            topics={profile.topics}
            levels={profile.levels}
            hasHistory={profile.hasHistory}
            dueCount={profile.dueReviews.length}
          />
        ) : <>
        <section
          className={`personalization-banner ${
            auth.user ? "personalization-banner--active" : "personalization-banner--guest"
          }`}
          aria-label="Personalization status"
        >
          <div className="personalization-banner__content">
            <div className="personalization-banner__header">
              <span>{auth.user ? "✨" : "🎯"}</span>
              <strong>{auth.user ? "Personalized Cloud Q&A Active" : "Personalized Q&A"}</strong>
              <span className="personalization-banner__badge">
                {auth.user ? "Cloud Synced" : "Saved on this device"}
              </span>
            </div>
            <p className="personalization-banner__desc">
              {auth.user ? (
                <>
                  Signed in as <strong>{auth.user.email}</strong>. You are getting personalized questions and answers calibrated to your weak spots and synced across devices.
                </>
              ) : (
                <>
                  Through signing in, you get personalized questions and answers tailored to your weak spots, with progress synced across devices. Login is optional — on this browser, questions still adapt locally to your quiz results.
                </>
              )}
            </p>
          </div>
        </section>

        <PromptInput
          onGenerate={handleGenerate}
          onRefine={handleRefine}
          onFocusWeakSpots={handleFocusWeakSpots}
          hasResult={!!result}
          hasHistory={profile.hasHistory}
          disabled={status === "loading" || status === "slow"}
        />

        {profile.dueReviews.length > 0 && !reviewing && (
          <button type="button" className="button button--primary" onClick={() => setReviewing(true)}>
            Review due items ({profile.dueReviews.length})
          </button>
        )}
        {reviewing && profile.dueReviews.length > 0 && (
          <ReviewDue questions={profile.dueReviews} onAnswer={profile.recordAnswer} onClose={() => setReviewing(false)} />
        )}

        {(status === "loading" || status === "slow") && <LoadingState slow={status === "slow"} streamedChars={streamedChars} />}

        {status === "error" && <ErrorState message={error?.message} onRetry={retry} />}

        {result && status !== "loading" && status !== "slow" && (
          <>
            <div className="result-actions">
              {history.length > 0 && (
                <button type="button" className="button" onClick={undoRefine}>
                  ↶ Undo last refine
                </button>
              )}
              <button type="button" className="button" onClick={() => exportSessionAsJson(result)}>
                Export session
              </button>
              <label className="button">
                Import session
                <input type="file" accept="application/json" hidden onChange={handleImport} />
              </label>
              {profile.hasHistory && (
                <button type="button" className="button button--muted" onClick={profile.reset}>
                  Reset progress
                </button>
              )}
            </div>
          <ResultView result={result} droppedCount={droppedCount} onAnswer={handleAnswer} />
          </>
        )}

        {!result && status === "idle" && (
          <p className="empty-note">
            Paste some notes or a topic above to generate your first study set.
          </p>
        )}
        </>}
      </main>
    </div>
  );
}
