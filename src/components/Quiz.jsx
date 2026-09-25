import { useEffect, useMemo, useState } from "react";
import { isCorrectOption } from "../lib/interaction";

/**
 * @param {object[]} questions mcq blocks
 * @param {(block:object, wasCorrect:boolean) => void} onAnswer called once per
 *   question, used to update the learner model
 */
export default function Quiz({ questions, onAnswer }) {
  const [pool, setPool] = useState(questions);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [wrongIds, setWrongIds] = useState(new Set());
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    setPool(questions);
    setIndex(0);
    setSelected(null);
    setWrongIds(new Set());
    setFinished(false);
    setScore(0);
  }, [questions]);

  const current = pool[index];
  const answeredCount = Math.min(pool.length, index + (selected !== null ? 1 : 0));

  useEffect(() => {
    function onKey(e) {
      if (e.target.closest?.("input, textarea, select, [contenteditable='true']")) return;
      if (selected !== null || finished || !current) return;
      const n = Number(e.key);
      if (n >= 1 && n <= current.options.length) choose(n - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, finished, current]);

  function choose(optionIndex) {
    if (selected !== null || !current) return;
    setSelected(optionIndex);
    const correct = isCorrectOption(optionIndex, current.correctIndex);
    if (correct) setScore((s) => s + 1);
    else setWrongIds((prev) => new Set(prev).add(current.id));
    onAnswer?.(current, correct);
  }

  function next() {
    if (index + 1 < pool.length) {
      setIndex((i) => i + 1);
      setSelected(null);
    } else {
      setFinished(true);
    }
  }

  function retestWrong() {
    const retryPool = questions.filter((q) => wrongIds.has(q.id));
    setPool(retryPool);
    setIndex(0);
    setSelected(null);
    setWrongIds(new Set());
    setFinished(false);
    setScore(0);
  }

  function restartAll() {
    setPool(questions);
    setIndex(0);
    setSelected(null);
    setWrongIds(new Set());
    setFinished(false);
    setScore(0);
  }

  const wrongCount = useMemo(() => wrongIds.size, [wrongIds]);

  if (questions.length === 0) {
    return <p className="empty-note">No quiz questions in this set.</p>;
  }

  if (finished) {
    return (
      <div className="quiz quiz--summary">
        <p className="quiz__score">
          You got {score} of {pool.length} right.
        </p>
        <div className="deck__nav">
          {wrongCount > 0 && (
            <button type="button" className="button button--primary" onClick={retestWrong}>
              Re-test {wrongCount} wrong answer{wrongCount === 1 ? "" : "s"}
            </button>
          )}
          <button type="button" className="button" onClick={restartAll}>
            Restart quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz">
      <p className="deck__progress">
        Question {index + 1} of {pool.length} · {current.topic} · Score {score}/{answeredCount}
      </p>
      <p className="quiz__question">{current.question}</p>
      <ul className="quiz__options">
        {current.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === current.correctIndex;
          const showState = selected !== null;
          let className = "quiz__option";
          if (showState && isCorrect) className += " quiz__option--correct";
          if (showState && isSelected && !isCorrect) className += " quiz__option--wrong";

          return (
            <li key={i}>
              <button
                type="button"
                className={className}
                onClick={() => choose(i)}
                disabled={showState}
              >
                <span className="quiz__option-key">{i + 1}</span>
                {opt}
              </button>
              {showState && isSelected && !isCorrect && current.optionFeedback?.[i] && (
                <p className="quiz__feedback">{current.optionFeedback[i]}</p>
              )}
            </li>
          );
        })}
      </ul>

      {selected !== null && (
        <div className="quiz__after">
          {current.explanation && <p className="quiz__explanation">{current.explanation}</p>}
          <button type="button" className="button button--primary" onClick={next}>
            {index + 1 < pool.length ? "Next question →" : "See results"}
          </button>
        </div>
      )}
    </div>
  );
}
