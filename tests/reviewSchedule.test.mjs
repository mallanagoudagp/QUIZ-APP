import { test } from "node:test";
import assert from "node:assert/strict";
import { dueReviewBlocks, nextReview } from "../src/lib/reviewSchedule.js";

test("incorrect answers return to review after ten minutes", () => {
  const now = Date.UTC(2026, 0, 1);
  const item = { id: "q1" };
  const result = nextReview(item, { box: 4 }, false, now);
  assert.equal(result.box, 0);
  assert.equal(Date.parse(result.dueAt), now + 600000);
});

test("correct answers advance through Leitner intervals and due items surface", () => {
  const now = Date.UTC(2026, 0, 1);
  const item = { id: "q1" };
  const result = nextReview(item, { box: 1 }, true, now);
  assert.equal(result.box, 2);
  assert.equal(Date.parse(result.dueAt), now + 3 * 86400000);
  assert.deepEqual(dueReviewBlocks({ q1: result }, Date.parse(result.dueAt)), [item]);
  assert.deepEqual(dueReviewBlocks({ q1: result }, now), []);
});
