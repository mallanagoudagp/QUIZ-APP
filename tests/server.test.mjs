import { test } from "node:test";
import assert from "node:assert/strict";
import { handleGenerateStream } from "../server/generate.js";

test("mock provider streams a valid JSON response in chunks", async () => {
  const chunks = [];
  await handleGenerateStream({ prompt: "Photosynthesis" }, (chunk) => chunks.push(chunk));
  assert.ok(chunks.length > 1);
  const value = JSON.parse(chunks.join(""));
  assert.ok(Array.isArray(value.blocks));
});

test("debug malformed response is streamed for failure-state checks", async () => {
  const chunks = [];
  await handleGenerateStream({ prompt: "ignored", simulate: "malformed" }, (chunk) => chunks.push(chunk));
  assert.throws(() => JSON.parse(chunks.join("")));
});

test("identical streamed requests use the in-memory response cache", async () => {
  const prompt = `cache check ${Date.now()}`;
  const first = [];
  const second = [];
  await handleGenerateStream({ prompt }, (chunk) => first.push(chunk));
  await handleGenerateStream({ prompt }, (chunk) => second.push(chunk));
  assert.ok(first.length > 1);
  assert.equal(second.length, 1);
  assert.equal(second.join(""), first.join(""));
});
