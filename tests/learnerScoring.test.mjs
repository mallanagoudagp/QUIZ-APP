import { test } from "node:test";
import assert from "node:assert/strict";
import { levelForStats, questionsByTopic, scoreQuestion, statsFromQuestionHistory } from "../src/lib/learnerScoring.js";

test("re-answering one question updates its result without adding another question", () => {
  const alreadyCorrect = scoreQuestion({ attempts: 1, correct: 1 }, { box: 1 }, true);
  assert.deepEqual(alreadyCorrect, { attempts: 1, correct: 1 });

  const correctedAfterWrong = scoreQuestion({ attempts: 1, correct: 0 }, { box: 0 }, true);
  assert.deepEqual(correctedAfterWrong, { attempts: 1, correct: 1 });
});

test("topic confidence uses distinct question history and waits for enough evidence", () => {
  const history = {
    a: { box: 2, block: { type: "mcq", subject: "Biology", topic: "Cells", question: "What is a cell?" } },
    b: { box: 1, block: { type: "mcq", subject: "Biology", topic: "Cells", question: "Where is DNA stored?" } },
    c: { box: 1, block: { type: "mcq", subject: "Biology", topic: "Cells", question: "What does a membrane do?" } },
    d: { box: 1, block: { type: "mcq", subject: "Biology", topic: "Cells", question: "What is cytoplasm?" } },
    e: { box: 1, block: { type: "mcq", subject: "Biology", topic: "Cells", question: "What makes proteins?" } }
  };
  const stats = Object.values(statsFromQuestionHistory(history))[0];
  assert.deepEqual({ attempts: stats.attempts, correct: stats.correct }, { attempts: 5, correct: 5 });
  assert.equal(levelForStats({ attempts: 1, correct: 1 }), "beginner");
  assert.equal(levelForStats({ attempts: 3, correct: 3 }), "intermediate");
  assert.equal(levelForStats(stats), "advanced");
});

test("topic history provides question stems to avoid repeating", () => {
  const history = {
    a: { box: 0, block: { type: "mcq", topic: "Cells", question: "Where is DNA stored?" } },
    b: { box: 1, block: { type: "mcq", topic: "Cells", question: "What does a membrane do?" } }
  };
  assert.deepEqual(questionsByTopic(history), {
    Cells: ["Where is DNA stored?", "What does a membrane do?"]
  });
});
