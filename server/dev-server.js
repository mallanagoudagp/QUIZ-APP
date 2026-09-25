import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleGenerate, handleGenerateStream, isRateLimited, rateLimitKeyFromReq } from "./generate.js";
import { MAX_INPUT_LENGTH } from "../shared/limits.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

app.post("/api/generate", async (req, res) => {
  if (isRateLimited(rateLimitKeyFromReq(req))) {
    return res.status(429).json({ error: "Too many requests, slow down a little." });
  }
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  const controller = new AbortController();
  res.on("close", () => controller.abort());
  try {
    await handleGenerateStream(req.body, (text) => res.write(`data: ${JSON.stringify({ text })}\n\n`), controller.signal);
    if (!res.destroyed) res.end("data: {\"done\":true}\n\n");
  } catch (error) {
    const detail = error.providerStatus ? `HTTP ${error.providerStatus}${error.providerReason ? `/${error.providerReason}` : ""}` : `${error.name}${error.cause?.code ? `/${error.cause.code}` : ""}`;
    console.error(`[recall] ${process.env.LLM_PROVIDER || "mock"} stream failed (${detail})`);
    const message = error.code === "input-too-long"
      ? `Your notes are over the ${MAX_INPUT_LENGTH.toLocaleString()} character limit. Shorten them and try again.`
      : "The AI provider request failed.";
    if (!res.destroyed) res.end(`data: ${JSON.stringify({ error: { code: error.code || "request-failed", message } })}\n\n`);
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`[recall] API server listening on http://localhost:${port}`);
  console.log(`[recall] provider: ${process.env.LLM_PROVIDER || "mock"}`);
});
