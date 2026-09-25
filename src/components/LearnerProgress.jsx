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
  const levelsSummary = rows.reduce((summary, [topic]) => {
    const level = levels?.[topic] || "beginner";
    summary[level] += 1;
    return summary;
  }, { beginner: 0, intermediate: 0, advanced: 0 });

  return (
    <section className="learner-progress" aria-label="Your learning progress">
      <div className="learner-progress__header">
        <div>
          <p className="learner-progress__eyebrow">PERSONALIZED STUDY DASHBOARD</p>
          <h2>Your learning progress</h2>
          <p className="learner-progress__intro">
            See what you’ve practiced, where you’re improving, and how your next study set adapts.
          </p>
        </div>
      </div>

      {!hasHistory ? (
        <div className="learner-progress__empty panel">
          <span className="learner-progress__empty-icon" aria-hidden="true">▥</span>
          <h3>Your progress will show up here</h3>
          <p>Generate a study set, open its Quiz tab, and answer the multiple-choice questions. Recall scores every answer by topic. Your next generation will use those scores automatically.</p>
        </div>
      ) : (
        <>
          <div className="learner-progress__stats" aria-label="Progress summary">
            <article className="learner-progress__stat panel">
              <span className="learner-progress__stat-label">Overall accuracy</span>
              <strong>{overall}<small>%</small></strong>
              <span className="learner-progress__stat-note">{totals.correct} correct out of {totals.attempts} answers</span>
            </article>
            <article className="learner-progress__stat panel">
              <span className="learner-progress__stat-label">Topics practiced</span>
              <strong>{rows.length}</strong>
              <span className="learner-progress__stat-note">Each topic has its own adaptive level</span>
            </article>
            <article className="learner-progress__stat panel">
              <span className="learner-progress__stat-label">Current levels</span>
              <strong>{levelsSummary.beginner}<small> beginner</small></strong>
              <span className="learner-progress__stat-note">{levelsSummary.intermediate} intermediate · {levelsSummary.advanced} advanced</span>
            </article>
            <article className="learner-progress__stat panel">
              <span className="learner-progress__stat-label">Reviews due</span>
              <strong>{dueCount}</strong>
              <span className="learner-progress__stat-note">Scheduled from your quiz answers</span>
            </article>
          </div>

          <section className="learner-progress__section panel" aria-labelledby="topic-progress-heading">
            <div className="learner-progress__section-heading">
              <div>
                <h3 id="topic-progress-heading">Progress by topic</h3>
                <p>Accuracy determines the level used for future questions and explanations.</p>
              </div>
              <span className="learner-progress__topic-count">{rows.length} topics</span>
            </div>
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
                      <td>
                        <div className="learner-progress__accuracy">
                          <span>{percent}%</span>
                          <span className="learner-progress__bar" aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>
                        </div>
                      </td>
                      <td><span className={`level-pill level-pill--${level}`}>{level}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </section>
          <div className="learner-progress__levels">
            <div><h3>How adaptive levels work</h3><p>Quiz choices are scored automatically. Recall recalculates your level for each topic from your accuracy.</p></div>
            <ul>
              {Object.entries(LEVEL_DETAILS).map(([level, detail]) => (
                <li key={level}><strong>{level[0].toUpperCase() + level.slice(1)}:</strong> {detail}</li>
              ))}
            </ul>
          </div>
          <p className="learner-progress__next">
            Every new generation and refinement receives these topic levels. Use <strong>Focus on my weak spots</strong> on the Study page to target your three lowest-accuracy topics.
            {dueCount > 0 && ` You also have ${dueCount} scheduled review item${dueCount === 1 ? "" : "s"} due.`}
          </p>
        </>
      )}
    </section>
  );
}
