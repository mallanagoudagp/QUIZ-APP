import { useCallback, useRef, useState } from "react";
import { generate } from "../lib/api";
import { validateResult } from "../lib/validateResult";
import { preserveSummaryOnRefine } from "../lib/refineResult";

const SLOW_AFTER_MS = 6000;

/**
 * Owns the full request lifecycle for a generate/refine call:
 * - loading / slow / error / result state
 * - a request-id guard AND an abort of the previous request, so a slow older
 *   response can never clobber a newer one
 * - validation of the raw response before it ever reaches the UI
 */
export function useGenerate() {
  const [status, setStatus] = useState("idle"); // idle | loading | slow | error | success
  const [error, setError] = useState(null); // { reason, message }
  const [result, setResult] = useState(null); // { title, blocks }
  const [droppedCount, setDroppedCount] = useState(0);
  const [streamedChars, setStreamedChars] = useState(0);

  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const lastArgsRef = useRef(null); // for Retry

  const run = useCallback(async (args) => {
    lastArgsRef.current = args;

    // Cancel whatever's in flight — its result would be stale anyway.
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const id = ++requestIdRef.current;
    setStatus("loading");
    setError(null);
    setStreamedChars(0);

    const slowTimer = setTimeout(() => {
      if (requestIdRef.current === id) setStatus("slow");
    }, SLOW_AFTER_MS);

    try {
      const raw = await generate({ ...args, signal: controller.signal, onChunk: (text) => {
        if (requestIdRef.current === id) setStreamedChars(text.length);
      } });
      if (requestIdRef.current !== id) return; // a newer request has since started

      const validation = validateResult(raw);
      if (!validation.ok) {
        setStatus("error");
        setError({
          reason: validation.reason,
          message: messageFor(validation.reason)
        });
        return;
      }

      const result = args.refine
        ? preserveSummaryOnRefine(args.refine.previousResult, validation.data, args.refine.instruction)
        : validation.data;
      setResult(result);
      setDroppedCount(validation.droppedCount);
      setStatus("success");
    } catch (err) {
      if (requestIdRef.current !== id) return;
      const reason = err.message === "timeout-or-aborted" ? "timeout"
        : err.message === "input-too-long" ? "input-too-long" : "request-failed";
      setStatus("error");
      setError({ reason, message: messageFor(reason) });
    } finally {
      clearTimeout(slowTimer);
    }
  }, []);

  const retry = useCallback(() => {
    if (lastArgsRef.current) run(lastArgsRef.current);
  }, [run]);

  const setResultFromExternal = useCallback((data) => {
    setResult(data);
    setStatus("idle");
    setError(null);
  }, []);

  return { status, error, result, droppedCount, streamedChars, run, retry, setResult: setResultFromExternal };
}

function messageFor(reason) {
  switch (reason) {
    case "empty":
      return "The model returned an empty response. Try again, or rephrase your input.";
    case "malformed-json":
      return "The model's response wasn't valid JSON. This can happen occasionally — try again.";
    case "wrong-shape":
      return "The response didn't match the expected format closely enough to use.";
    case "timeout":
      return "That took too long and was cancelled. Try again — shorter input often helps.";
    case "input-too-long":
      return "Your notes are over the 20,000 character limit. Shorten them and try again.";
    default:
      return "Something went wrong talking to the AI provider. Please try again.";
  }
}
