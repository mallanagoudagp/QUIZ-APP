const LEVEL_DETAILS = {
  beginner: "Builds fundamentals with easier questions and plain-language explanations. A topic needs at least 3 distinct questions before moving up.",
  intermediate: "Uses a mix of medium questions and explanations that assume the basics.",
  advanced: "Uses harder questions and concise, more technical explanations. At least 5 distinct questions are needed to reach this level."
};

export default function LearnerProgress({ topics, levels, hasHistory, dueCount = 0 }) {
  const rows = Object.entries(topics || {}).sort((a, b) =>
    (a[1].topic || a[0]).localeCompare(b[1].topic || b[0], undefined, { sensitivity: "base" })
  );
  const subjects = Object.entries(rows.reduce((groups, [key, stats]) => {
    const subject = stats.subject || "Previously studied";
    (groups[subject] ||= []).push([key, stats]);
    return groups;
  }, {})).sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }));
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
          <p>Generate a study set, open its Quiz tab, and answer the multiple-choice questions. Recall tracks distinct questions by topic, so retrying the same question cannot inflate its confidence score. Your next generation uses those scores automatically.</p>
        </div>
      ) : (
        <>
          <div className="learner-progress__stats" aria-label="Progress summary">
            <article className="learner-progress__stat panel">
              <span className="learner-progress__stat-label">Overall accuracy</span>
              <strong>{overall}<small>%</small></strong>
              <span className="learner-progress__stat-note">{totals.correct} correct across {totals.attempts} distinct questions</span>
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

          <div className="learner-progress__subjects" aria-label="Progress grouped by subject">
            {subjects.map(([subject, subjectRows], index) => {
              const subjectAttempts = subjectRows.reduce((sum, [, stats]) => sum + stats.attempts, 0);
              const subjectCorrect = subjectRows.reduce((sum, [, stats]) => sum + stats.correct, 0);
              const subjectAccuracy = subjectAttempts ? Math.round((subjectCorrect / subjectAttempts) * 100) : 0;
              const headingId = `subject-progress-${index}`;
              return (
                <section className="learner-progress__section panel" key={subject} aria-labelledby={headingId}>
                  <div className="learner-progress__section-heading">
                    <div>
                      <h3 id={headingId}>{subject}</h3>
                      <p>{subjectRows.length} topic{subjectRows.length === 1 ? "" : "s"} · {subjectCorrect}/{subjectAttempts} correct · {subjectAccuracy}% accuracy</p>
                    </div>
                    <span className="learner-progress__topic-count">{subjectRows.length} topics</span>
                  </div>
                  <div className="learner-progress__table-wrap">
                    <table className="learner-progress__table">
                      <thead>
                        <tr><th scope="col">Topic</th><th scope="col">Distinct question score</th><th scope="col">Accuracy</th><th scope="col">Current level</th></tr>
                      </thead>
                      <tbody>
                        {subjectRows.map(([key, stats]) => {
                          const percent = stats.attempts ? Math.round((stats.correct / stats.attempts) * 100) : 0;
                          const level = levels?.[key] || "beginner";
                          return (
                            <tr key={key}>
                              <th scope="row">{stats.topic || key}</th>
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
              );
            })}
          </div>
          <div className="learner-progress__levels">
            <div><h3>How adaptive levels work</h3><p>Each distinct question counts once, using its latest answer. Repeating a question cannot add another correct answer. Recall also waits for at least 3 distinct questions before moving a topic above beginner and 5 before advanced.</p></div>
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
