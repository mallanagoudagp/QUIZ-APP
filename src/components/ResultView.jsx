import { useEffect, useMemo, useState } from "react";
import FlashcardDeck from "./FlashcardDeck";
import Quiz from "./Quiz";
import SummaryBlock from "./SummaryBlock";

const TABS = [
  { key: "cards", label: "Flashcards", icon: "🃏" },
  { key: "quiz", label: "Quiz", icon: "📝" },
  { key: "summary", label: "Summary", icon: "💡" }
];

export default function ResultView({ result, droppedCount, onAnswer }) {
  const cards = useMemo(() => result.blocks.filter((b) => b.type === "flashcard"), [result.blocks]);
  const mcqs = useMemo(() => result.blocks.filter((b) => b.type === "mcq"), [result.blocks]);
  const summaries = useMemo(() => result.blocks.filter((b) => b.type === "summary"), [result.blocks]);

  const available = TABS.filter(
    (t) =>
      (t.key === "cards" && cards.length) ||
      (t.key === "quiz" && mcqs.length) ||
      (t.key === "summary" && summaries.length)
  );
  const [tab, setTab] = useState(available[0]?.key);
  useEffect(() => {
    if (!available.some((item) => item.key === tab)) setTab(available[0]?.key);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length, mcqs.length, summaries.length, tab]);

  return (
    <div className="result">
      <h2 className="result__title">{result.title}</h2>

      {droppedCount > 0 && (
        <p className="result__notice">
          {droppedCount} item{droppedCount === 1 ? "" : "s"} in the response didn't match the
          expected format and {droppedCount === 1 ? "was" : "were"} skipped.
        </p>
      )}

      <div className="tabs" role="tablist">
        {available.map((t) => {
          const count = t.key === "cards" ? cards.length : t.key === "quiz" ? mcqs.length : summaries.length;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`tab ${tab === t.key ? "tab--active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              <span>{t.icon}</span> {t.label}
              {count > 0 && <span className="tab__count">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="tab-panel">
        {tab === "cards" && <FlashcardDeck cards={cards} />}
        {tab === "quiz" && <Quiz questions={mcqs} onAnswer={onAnswer} />}
        {tab === "summary" && summaries.map((s) => <SummaryBlock key={s.id} points={s.points} />)}
      </div>
    </div>
  );
}
