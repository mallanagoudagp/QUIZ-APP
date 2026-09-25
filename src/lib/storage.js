const SESSION_KEY = "recall.session.v1";
const LEARNER_KEY = "recall.learner.v1";

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable (e.g. private mode) — fail silently,
    // the app still works, it just won't persist across reloads.
  }
}

export function loadSession() {
  return safeGet(SESSION_KEY, null);
}

export function saveSession(session) {
  safeSet(SESSION_KEY, session);
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function loadLearnerModel() {
  return safeGet(LEARNER_KEY, { topics: {}, missed: {} });
}

export function saveLearnerModel(model) {
  safeSet(LEARNER_KEY, model);
}

export function exportSessionAsJson(session) {
  const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "recall-session.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function importSessionFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error("That file isn't valid JSON."));
      }
    };
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsText(file);
  });
}
