import Quiz from "./Quiz";

export default function ReviewDue({ questions, onAnswer, onClose }) {
  return (
    <section className="result panel" aria-label="Scheduled review">
      <div className="result-actions">
        <h2>Scheduled review</h2>
        <button type="button" className="button" onClick={onClose}>Close review</button>
      </div>
      <Quiz questions={questions} onAnswer={onAnswer} />
    </section>
  );
}
