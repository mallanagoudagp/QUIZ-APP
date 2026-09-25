import { test } from "node:test";
import assert from "node:assert/strict";
import { isCorrectOption, nextCardIndex } from "../src/lib/interaction.js";

test("flashcard navigation clamps at each end of the deck", () => {
  assert.equal(nextCardIndex(0, -1, 4), 0);
  assert.equal(nextCardIndex(2, 1, 4), 3);
  assert.equal(nextCardIndex(3, 1, 4), 3);
});

test("quiz identifies correct and incorrect choices", () => {
  assert.equal(isCorrectOption(2, 2), true);
  assert.equal(isCorrectOption(1, 2), false);
});
