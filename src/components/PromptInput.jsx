import { useState } from "react";
import { MAX_INPUT_LENGTH } from "../../shared/limits.js";

const DEBUG = new URLSearchParams(window.location.search).has("debug");
const SIMULATIONS = ["good", "malformed", "wrong-shape", "empty", "slow", "fail"];

const QUICK_TOPICS = [
  {
    label: "🧪 Organic Chemistry",
    text: "Alcohol group = -OH\nCarboxylic acid group = -COOH\nEthanol = C2H5OH\nEthanoic acid = CH3COOH\nSoap is prepared by saponification.\nHydrogenation converts vegetable oil into ghee.\nImportant reactions: Combustion, Oxidation, Addition, and Substitution."
  },
  {
    label: "🌿 Photosynthesis",
    text: "Light-dependent reactions occur in thylakoid membranes, producing ATP and NADPH. The Calvin cycle occurs in the stroma, using RuBisCO to fix CO2 into G3P sugar. Chlorophyll absorbs blue and red wavelengths."
  },
  {
    label: "⚛️ Newton's Laws",
    text: "First Law: Law of Inertia (objects maintain velocity unless acted upon by net force). Second Law: F = ma (Force equals mass times acceleration). Third Law: For every action, there is an equal and opposite reaction."
  }
];

export default function PromptInput({
  onGenerate,
  onRefine,
  onFocusWeakSpots,
  hasResult,
  hasHistory,
  disabled
}) {
  const [text, setText] = useState("");
  const [refineText, setRefineText] = useState("");
  const [simulate, setSimulate] = useState("good");

  function submit(e) {
    e.preventDefault();
    if (!text.trim() && simulate === "good") return;
    onGenerate(text, DEBUG ? simulate : undefined);
  }

  function submitRefine(e) {
    e.preventDefault();
    if (!refineText.trim()) return;
    onRefine(refineText);
    setRefineText("");
  }

  return (
    <div className="prompt-panel">
      <form onSubmit={submit} className="prompt-form">
        <div className="prompt-form__header">
          <label htmlFor="notes" className="field-label">
            Paste your study notes or enter a topic
          </label>
          <div className="prompt-suggestions">
            <span className="prompt-suggestions__label">Quick topics:</span>
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic.label}
                type="button"
                className="chip"
                onClick={() => setText(topic.text)}
                disabled={disabled}
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          id="notes"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste lecture notes, study bullet points, textbook excerpts, or type any subject..."
          rows={6}
          maxLength={MAX_INPUT_LENGTH}
          disabled={disabled}
        />
        <div className="prompt-meta">
          <div className="prompt-meter">
            <div
              className="prompt-meter__bar"
              style={{ width: `${Math.min(100, (text.length / MAX_INPUT_LENGTH) * 100)}%` }}
            />
          </div>
          <span className="hint prompt-count">
            {text.length.toLocaleString()} / {MAX_INPUT_LENGTH.toLocaleString()} characters
          </span>
        </div>
        <div className="prompt-actions">
          <button type="submit" className="button button--primary" disabled={disabled}>
            Generate study set
          </button>
          {hasResult && hasHistory && (
            <button
              type="button"
              className="button"
              disabled={disabled}
              onClick={() => onFocusWeakSpots(DEBUG ? simulate : undefined)}
              title="Generate a new set focused on the topics you're missing"
            >
              Focus on my weak spots
            </button>
          )}
        </div>
      </form>

      {hasResult && (
        <form onSubmit={submitRefine} className="refine-form">
          <label htmlFor="refine" className="field-label">
            Refine the current set
          </label>
          <div className="refine-row">
            <input
              id="refine"
              type="text"
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              placeholder="e.g. make these harder, or add 3 more on the Calvin cycle"
              disabled={disabled}
            />
            <button type="submit" className="button" disabled={disabled}>
              Refine
            </button>
          </div>
        </form>
      )}

      {DEBUG && (
        <div className="debug-panel">
          <span className="field-label">Simulate response (dev only)</span>
          <div className="debug-panel__options">
            {SIMULATIONS.map((s) => (
              <label key={s} className="debug-option">
                <input
                  type="radio"
                  name="simulate"
                  value={s}
                  checked={simulate === s}
                  onChange={() => setSimulate(s)}
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
