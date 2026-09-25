import { handleGenerateStream, isRateLimited } from "../server/generate.js";
import { MAX_INPUT_LENGTH } from "../shared/limits.js";

// Vercel Node serverless function: POST /api/generate
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const key = req.headers["x-forwarded-for"] || "anonymous";
  if (isRateLimited(Array.isArray(key) ? key[0] : key)) {
    res.status(429).json({ error: "Too many requests, slow down a little." });
    return;
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  try {
    await handleGenerateStream(req.body, (text) => res.write(`data: ${JSON.stringify({ text })}\n\n`));
    res.end("data: {\"done\":true}\n\n");
  } catch (error) {
    const detail = error.providerStatus ? `HTTP ${error.providerStatus}${error.providerReason ? `/${error.providerReason}` : ""}` : error.name;
    console.error(`[recall] ${process.env.LLM_PROVIDER || "mock"} stream failed (${detail})`);
    const message = error.code === "input-too-long"
      ? `Your notes are over the ${MAX_INPUT_LENGTH.toLocaleString()} character limit. Shorten them and try again.`
      : "The AI provider request failed.";
    res.write(`data: ${JSON.stringify({ error: { code: error.code || "request-failed", message } })}\n\n`);
    res.end();
  }
}
