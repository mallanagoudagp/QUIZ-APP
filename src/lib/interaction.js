export function nextCardIndex(index, delta, length) {
  return Math.max(0, Math.min(Math.max(0, length - 1), index + delta));
}

export function isCorrectOption(selectedIndex, correctIndex) {
  return selectedIndex === correctIndex;
}
