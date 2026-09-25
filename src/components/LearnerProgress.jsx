const LEVEL_DETAILS = {
  beginner: "Builds fundamentals with easier questions and plain-language explanations.",
  intermediate: "Uses a mix of medium questions and explanations that assume the basics.",
  advanced: "Uses harder questions and concise, more technical explanations."
};

export default function LearnerProgress({ topics, levels, hasHistory, dueCount = 0 }) {
  const rows = Object.entries(topics || {}).sort((a, b) =>
    a[0].localeCompare(b[0], undefined, { sensitivity: "base" })
  );
  const totals = rows.reduce((sum, [, stats]) => ({
    attempts: sum.attempts + stats.attempts,
    correct: sum.correct + stats.correct
  }), { attempts: 0, correct: 0 });
  const overall = totals.attempts ? Math.round((totals.correct / totals.attempts) * 100) : 0;

  return (
    <section className="learner-progress panel" aria-label="Your learning progress">
      <div className="learner-progress__header">
        <div>
          <h2>Your learning progress</h2>
          <p className="learner-progress__intro">
            Quiz choices are scored automatically. Accuracy is tracked separately for each topic.
          </p>
        </div>
        {hasHistory && (
          <div className="learner-progress__total">
            <strong>{totals.correct}/{totals.attempts}</strong>
            <span>correct · {overall}% overall</span>
          </div>
        )}
      </div>

      {!hasHistory ? (
        <p className="learner-progress__empty">
          Generate a study set, open its Quiz tab, and answer the multiple-choice questions. Each answer builds your topic scores. Your next generation will use those scores automatically.
        </p>
      ) : (
        <>
          <div className="learner-progress__table-wrap">
            <table className="learner-progress__table">
              <thead>
                <tr><th scope="col">Topic</th><th scope="col">Score</th><th scope="col">Accuracy</th><th scope="col">Current level</th></tr>
              </thead>
              <tbody>
                {rows.map(([topic, stats]) => {
                  const percent = stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0;
                  const level = levels?.[topic] || "beginner";
                  return (
                    <tr key={topic}>
                      <th scope="row">{topic}</th>
                      <td>{stats.correct}/{stats.attempts}</td>
                      <td>{percent}%</td>
                      <td><span className={`level-pill level-pill--${level}`}>{level}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="learner-progress__levels">
            <p><strong>How levels are set:</strong> below 40% = beginner; 40–74% = intermediate; 75% or higher = advanced.</p>
            <ul>
              {Object.entries(LEVEL_DETAILS).map(([level, detail]) => (
                <li key={level}><strong>{level[0].toUpperCase() + level.slice(1)}:</strong> {detail}</li>
              ))}
            </ul>
          </div>
          <p className="learner-progress__next">
            Every new generation and refinement receives these topic levels. Use <strong>Focus on my weak spots</strong> to target your three lowest-accuracy topics.
            {dueCount > 0 && ` You also have ${dueCount} scheduled review item${dueCount === 1 ? "" : "s"} due.`}
          </p>
        </>
      )}
    </section>
  );
}
