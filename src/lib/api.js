const TIMEOUT_MS = 30000;

/**
 * The only function in the app that makes a network call. Always hits our
 * own backend (/api/generate) — never an LLM provider directly — so the API
 * key never has to exist in the browser.
 *
 * @param {object} params
 * @param {string} [params.prompt]
 * @param {object} [params.learnerContext]
 * @param {{previousResult: object, instruction: string}} [params.refine]
 * @param {string} [params.simulate] dev-only failure simulation, see ?debug=1
 * @param {AbortSignal} [params.signal]
 * @returns {Promise<string>} raw text from the model (not yet validated)
 */
export async function generate({ prompt, learnerContext, refine, simulate, signal, onChunk }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  // Let an external abort (stale-request guard) also cancel this fetch.
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeout);
      controller.abort();
    } else {
      signal.addEventListener("abort", () => { clearTimeout(timeout); controller.abort(); }, { once: true });
    }
  }

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, learnerContext, refine, simulate }),
      signal: controller.signal
    });

    if (res.headers.get("content-type")?.includes("text/event-stream")) {
      // Non-ok SSE responses still arrive here; errors are signalled via data frames.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let raw = "";
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        if (done && buffer) buffer += "\n\n";
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() || "";
        for (const frame of frames) {
          const line = frame.split(/\r?\n/).find((part) => part.startsWith("data:"));
          if (!line) continue;
          const event = JSON.parse(line.slice(5).trim());
          if (event.error) {
            const failure = new Error(event.error.code === "input-too-long" ? "input-too-long" : "request-failed");
            failure.userMessage = event.error.message;
            throw failure;
          }
          if (event.text) { raw += event.text; onChunk?.(raw); }
        }
        if (done) break;
      }
      return raw;
    }
    // Non-streaming JSON fallback (e.g. Vercel cold-start or legacy path).
    let body;
    try {
      body = await res.json();
    } catch {
      throw new Error("bad-response");
    }

    if (!res.ok) {
      throw new Error(body?.error || "request-failed");
    }

    return body.raw ?? "";
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("timeout-or-aborted");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
