const topicKey = (subject, topic) => JSON.stringify([subject, topic]);

export function levelForStats(stats) {
  const attempts = Number(stats?.attempts) || 0;
  const correct = Number(stats?.correct) || 0;
  if (attempts < 3) return "beginner";
  const accuracy = correct / attempts;
  if (accuracy < 0.4) return "beginner";
  if (accuracy < 0.75 || attempts < 5) return "intermediate";
  return "advanced";
}

/** Build topic accuracy from the latest result for each distinct question. */
export function statsFromQuestionHistory(history = {}) {
  const stats = {};
  for (const entry of Object.values(history)) {
    const block = entry?.block;
    if (!block || block.type !== "mcq" || !block.question) continue;
    const subject = block.subject?.trim() || "Previously studied";
    const topic = block.topic || "General";
    const key = topicKey(subject, topic);
    const current = stats[key] || { subject, topic, attempts: 0, correct: 0 };
    stats[key] = {
      ...current,
      attempts: current.attempts + 1,
      correct: current.correct + (entry.box > 0 ? 1 : 0)
    };
  }
  return stats;
}

/** Update one question's contribution without counting repeats as new evidence. */
export function scoreQuestion(stats, previousReview, wasCorrect) {
  const hadPreviousResult = !!previousReview;
  const wasPreviouslyCorrect = hadPreviousResult && previousReview.box > 0;
  return {
    attempts: (stats?.attempts || 0) + (hadPreviousResult ? 0 : 1),
    correct: (stats?.correct || 0) + (hadPreviousResult
      ? Number(wasCorrect) - Number(wasPreviouslyCorrect)
      : Number(wasCorrect))
  };
}

/** Return a compact list of recently used question stems for anti-repeat prompting. */
export function questionsByTopic(history = {}, limit = 12) {
  const result = {};
  for (const entry of Object.values(history)) {
    const block = entry?.block;
    if (!block || block.type !== "mcq" || !block.question) continue;
    const topic = block.topic || "General";
    const questions = result[topic] || [];
    if (!questions.includes(block.question) && questions.length < limit) {
      result[topic] = [...questions, block.question];
    }
  }
  return result;
}
