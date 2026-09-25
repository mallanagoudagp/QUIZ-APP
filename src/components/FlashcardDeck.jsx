import { useEffect, useState } from "react";
import { nextCardIndex } from "../lib/interaction";

export default function FlashcardDeck({ cards }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [cards]);

  useEffect(() => {
    function onKey(e) {
      if (e.target.closest?.("input, textarea, select, button, [contenteditable='true']")) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") {
        goTo(1);
      } else if (e.key === "ArrowLeft") {
        goTo(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  function goTo(delta) {
    setFlipped(false);
    setIndex((i) => nextCardIndex(i, delta, cards.length));
  }

  if (cards.length === 0) {
    return <p className="empty-note">No flashcards in this set.</p>;
  }

  const card = cards[index];

  return (
    <div className="deck">
      <p className="deck__progress">
        Card {index + 1} of {cards.length} · {card.topic}
      </p>
      <button
        type="button"
        className={`flashcard ${flipped ? "flashcard--flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        aria-label="Flip card"
      >
        <span className="flashcard__face flashcard__face--front">
          <span className="flashcard__text">{card.question}</span>
          <span className="flashcard__hint">👆 Click card to flip & reveal answer</span>
        </span>
        <span className="flashcard__face flashcard__face--back">
          <span className="flashcard__text">{card.answer}</span>
          <span className="flashcard__hint">👆 Click card to flip back</span>
        </span>
      </button>
      <div className="deck__nav">
        <button type="button" className="button" onClick={() => goTo(-1)} disabled={index === 0}>
          ← Previous
        </button>
        <span className="hint">Space to flip · arrows to move</span>
        <button
          type="button"
          className="button"
          onClick={() => goTo(1)}
          disabled={index === cards.length - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
