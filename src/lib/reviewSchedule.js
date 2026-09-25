const INTERVALS = [0, 1, 3, 7, 14, 30].map((days) => days * 24 * 60 * 60 * 1000);

export function reviewKey(block) {
  return `${block.topic || "General"}\u001f${block.question || block.id}`;
}

export function nextReview(block, previous, wasCorrect, now = Date.now()) {
  const oldBox = typeof previous === "object" ? previous.box || 0 : 0;
  const box = wasCorrect ? Math.min(5, oldBox + 1) : 0;
  const delay = wasCorrect ? INTERVALS[box] : 10 * 60 * 1000;
  return { block, box, dueAt: new Date(now + delay).toISOString() };
}

export function dueReviewBlocks(records, now = Date.now()) {
  return Object.values(records || {})
    .filter((entry) => entry?.block && Date.parse(entry.dueAt) <= now)
    .map((entry) => entry.block);
}
