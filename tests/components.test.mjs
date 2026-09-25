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

const { render, screen, fireEvent, cleanup } = await import("@testing-library/react");
const React = await import("react");
globalThis.React = React;
const { default: FlashcardDeck } = await import("../src/components/FlashcardDeck.jsx");
const { default: Quiz } = await import("../src/components/Quiz.jsx");

test("flashcard component flips and moves through the deck", () => {
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
  const questions = [{
    id: "q1", topic: "Biology", question: "Which is correct?", options: ["wrong", "right"],
    correctIndex: 1, explanation: "Reason", optionFeedback: ["Misconception", ""]
  }];
  const { rerender } = render(null);
  rerender(React.createElement(Quiz, { questions }));
  fireEvent.click(screen.getByRole("button", { name: /wrong/ }));
  assert.ok(screen.getByText("Misconception"));
  fireEvent.click(screen.getByRole("button", { name: /See results/ }));
  assert.ok(screen.getByText("You got 0 of 1 right."));
  fireEvent.click(screen.getByRole("button", { name: /Re-test 1 wrong answer/ }));
  assert.ok(screen.getByText("Which is correct?"));
});

after(() => {
  cleanup();
  dom.window.close();
});
