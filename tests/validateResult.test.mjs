import { test } from "node:test";
import assert from "node:assert/strict";
import { validateResult } from "../src/lib/validateResult.js";

const GOOD = JSON.stringify({
  title: "Sample",
  blocks: [
    {
      type: "flashcard",
      id: "c1",
      topic: "Topic",
      difficulty: "easy",
      question: "Q?",
      answer: "A."
    },
    {
      type: "mcq",
      id: "q1",
      topic: "Topic",
      difficulty: "easy",
      question: "Which?",
      options: ["a", "b", "c", "d"],
      correctIndex: 1,
      explanation: "Because b.",
      optionFeedback: ["no", "", "no", "no"]
    },
    { type: "summary", id: "s1", points: ["point one", "point two"] }
  ]
});

test("accepts a well-formed result", () => {
  const r = validateResult(GOOD);
  assert.equal(r.ok, true);
  assert.equal(r.data.blocks.length, 3);
  assert.equal(r.droppedCount, 0);
});

test("strips a markdown json fence before parsing", () => {
  const r = validateResult("```json\n" + GOOD + "\n```");
  assert.equal(r.ok, true);
});

test("rejects empty responses", () => {
  assert.deepEqual(validateResult(""), { ok: false, reason: "empty" });
  assert.deepEqual(validateResult("   "), { ok: false, reason: "empty" });
});

test("rejects malformed JSON", () => {
  const r = validateResult('{ "title": "x", "blocks": [ { "type": "flashcard"');
  assert.equal(r.ok, false);
  assert.equal(r.reason, "malformed-json");
});

test("rejects valid JSON with the wrong shape entirely", () => {
  const r = validateResult(JSON.stringify({ notes: "hi" }));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "wrong-shape");
});

test("drops an mcq block with an out-of-range correctIndex, keeps the rest", () => {
  const bad = JSON.parse(GOOD);
  bad.blocks.push({
    type: "mcq",
    id: "q2",
    topic: "Topic",
    question: "Bad?",
    options: ["a", "b"],
    correctIndex: 5,
    optionFeedback: ["", ""]
  });
  const r = validateResult(JSON.stringify(bad));
  assert.equal(r.ok, true);
  assert.equal(r.droppedCount, 1);
  assert.equal(r.data.blocks.length, 3);
});

test("drops an mcq block with duplicate options", () => {
  const bad = {
    title: "x",
    blocks: [
      {
        type: "mcq",
        id: "q1",
        topic: "t",
        question: "Q",
        options: ["same", "same", "c", "d"],
        correctIndex: 0
      }
    ]
  };
  const r = validateResult(JSON.stringify(bad));
  assert.equal(r.ok, false); // nothing valid left
  assert.equal(r.reason, "wrong-shape");
});

test("returns wrong-shape when every block is invalid", () => {
  const bad = { title: "x", blocks: [{ type: "flashcard", id: "c1" }] };
  const r = validateResult(JSON.stringify(bad));
  assert.equal(r.ok, false);
  assert.equal(r.reason, "wrong-shape");
});
