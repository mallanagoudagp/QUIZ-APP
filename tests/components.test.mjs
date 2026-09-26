import { test, after } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.MouseEvent = dom.window.MouseEvent;
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { render, screen, fireEvent, cleanup, within } = await import("@testing-library/react");
const React = await import("react");
globalThis.React = React;
const { default: FlashcardDeck } = await import("../src/components/FlashcardDeck.jsx");
const { default: Quiz } = await import("../src/components/Quiz.jsx");
const { default: LearnerProgress } = await import("../src/components/LearnerProgress.jsx");

test("flashcard component flips and moves through the deck", () => {
  cleanup();
  const cards = [
    { id: "c1", topic: "A", question: "Question one", answer: "Answer one" },
    { id: "c2", topic: "B", question: "Question two", answer: "Answer two" }
  ];
  render(React.createElement(FlashcardDeck, { cards }));
  fireEvent.click(screen.getByRole("button", { name: "Flip card" }));
  assert.ok(screen.getByText("Answer one"));
  fireEvent.click(screen.getByRole("button", { name: /Next/ }));
  assert.ok(screen.getByText("Question two"));
});

test("quiz component scores answers and offers wrong-answer retest", () => {
  cleanup();
  const questions = [{
    id: "q1", topic: "Biology", question: "Which is correct?", options: ["wrong", "right"],
    correctIndex: 1, explanation: "Reason", optionFeedback: ["Misconception", ""]
  }];
  const { rerender } = render(null);
  rerender(React.createElement(Quiz, { questions }));
  fireEvent.click(screen.getByRole("button", { name: /wrong/ }));
  assert.ok(screen.getByText(/Score 0\/1/));
  assert.ok(screen.getByText("Misconception"));
  fireEvent.click(screen.getByRole("button", { name: /See results/ }));
  assert.ok(screen.getByText("You got 0 of 1 right."));
  fireEvent.click(screen.getByRole("button", { name: /Re-test 1 wrong answer/ }));
  assert.ok(screen.getByText("Which is correct?"));
});

test("learner progress explains how quiz answers build personalization", () => {
  cleanup();
  render(React.createElement(LearnerProgress, {
    topics: {}, levels: {}, hasHistory: false
  }));
  assert.ok(screen.getByText(/answer the multiple-choice questions/i));
  assert.ok(screen.getByText(/Your next generation uses those scores automatically/i));
});

test("learner progress shows topic score, accuracy and current level", () => {
  cleanup();
  render(React.createElement(LearnerProgress, {
    topics: { Chemistry: { attempts: 5, correct: 1 } },
    levels: { Chemistry: "beginner" },
    hasHistory: true,
    dueCount: 1
  }));
  const table = within(screen.getByRole("table"));
  assert.ok(table.getByText("1/5"));
  assert.ok(table.getByText("20%"));
  assert.ok(table.getByText("beginner"));
  assert.ok(screen.getByText(/three lowest-accuracy topics/i));
});

after(() => {
  cleanup();
  dom.window.close();
});
