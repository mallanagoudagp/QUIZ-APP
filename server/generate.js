import { buildPrompt } from "./prompt.js";
import { mockGenerate } from "./mockProvider.js";
import { createHash } from "node:crypto";
import { MAX_INPUT_LENGTH } from "../shared/limits.js";

// Very small in-memory rate limiter, per process. Fine for an assignment /
// single-instance deploy; swap for a real store (Redis, Upstash) in
// production.
const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_LIMIT = 100;
const responseCache = new Map();

function cacheKey(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isRateLimited(key) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > MAX_REQUESTS_PER_WINDOW;
}

async function callGemini({ apiKey, model, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    })
  });
  if (!res.ok) {
    throw new Error(`Gemini request failed (${res.status})`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  return text;
}

async function callGroq({ apiKey, model, prompt }) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    })
  });
  if (!res.ok) {
    throw new Error(`Groq request failed (${res.status})`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function streamProvider({ provider, apiKey, model, prompt, onText, signal, simulate, learnerContext }) {
  if (provider === "mock") {
    const raw = await mockGenerate(simulate, learnerContext);
    for (let i = 0; i < raw.length; i += 48) {
      if (signal?.aborted) throw new Error("aborted");
      onText(raw.slice(i, i + 48));
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return;
  }
  if (!["gemini", "groq"].includes(provider)) throw new Error("Unknown LLM provider");
  if (!apiKey) throw new Error("Missing provider API key");
  const isGemini = provider === "gemini";
  const url = isGemini
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
    : "https://api.groq.com/openai/v1/chat/completions";
  const res = await fetch(url, {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", ...(isGemini ? {} : { Authorization: `Bearer ${apiKey}` }) },
    body: JSON.stringify(isGemini
      ? { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.7 } }
      : { model, messages: [{ role: "user", content: prompt }], temperature: 0.7, response_format: { type: "json_object" }, stream: true })
  });
  if (!res.ok) {
    let providerReason = "";
    try {
      const errJson = await res.json();
      providerReason = errJson?.error?.message || errJson?.error?.status || "";
    } catch { /* omit unreadable provider error */ }
    console.error(`[LLM Error] Status ${res.status}: ${providerReason}`);
    throw Object.assign(new Error("Provider stream failed"), { providerStatus: res.status, providerReason });
  }
  if (!res.body) throw new Error("Provider stream had no response body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  while (true) {
    const { value, done } = await reader.read();
    pending += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || "";
    if (done && pending) { lines.push(pending); pending = ""; }
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const text = isGemini
          ? parsed?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || ""
          : parsed?.choices?.[0]?.delta?.content || "";
        if (text) onText(text);
      } catch { /* ignore non-JSON keepalive frames */ }
    }
    if (done) break;
  }
}

export async function handleGenerateStream(body, onText, signal) {
  const { prompt: userInput, learnerContext, refine, simulate } = body || {};
  const provider = process.env.LLM_PROVIDER || "mock";
  if (provider !== "mock" && !userInput && !refine) throw new Error("Missing prompt.");
  if (userInput != null && typeof userInput !== "string") throw new Error("Prompt must be text.");
  if (userInput && userInput.length > MAX_INPUT_LENGTH) {
    throw Object.assign(new Error("input-too-long"), { code: "input-too-long" });
  }
  const fullPrompt = buildPrompt(userInput || "", { learnerContext, refine });
  const key = cacheKey({ provider, model: process.env.LLM_MODEL || "", userInput, learnerContext, refine });
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now() && !simulate) {
    onText(cached.raw);
    return;
  }
  let raw = "";
  await streamProvider({
    provider,
    apiKey: process.env.LLM_API_KEY,
    model: process.env.LLM_MODEL || (provider === "gemini" ? "gemini-2.0-flash" : "llama-3.3-70b-versatile"),
    prompt: fullPrompt,
    onText: (chunk) => { raw += chunk; onText(chunk); },
    signal,
    simulate,
    learnerContext
  });
  if (!simulate && raw.trim()) {
    responseCache.set(key, { raw, expiresAt: Date.now() + CACHE_TTL_MS });
    while (responseCache.size > CACHE_LIMIT) responseCache.delete(responseCache.keys().next().value);
  }
}

/**
 * Core handler, framework-agnostic: takes a plain body object, returns
 * { status, body }. Wrapped by server/dev-server.js (Express) and
 * api/generate.js (Vercel).
 */
export async function handleGenerate(body) {
  const { prompt: userInput, learnerContext, refine, simulate } = body || {};

  const provider = process.env.LLM_PROVIDER || "mock";

  const key = cacheKey({ provider, model: process.env.LLM_MODEL || "", userInput, learnerContext, refine });
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now() && !simulate) {
    responseCache.delete(key);
    responseCache.set(key, cached);
    return { status: 200, body: { raw: cached.raw, cached: true } };
  }

  if (provider !== "mock") {
    if (!userInput && !refine) {
      return { status: 400, body: { error: "Missing prompt." } };
    }
    if (userInput != null && typeof userInput !== "string") {
      return { status: 400, body: { error: "Prompt must be text." } };
    }
    if (userInput && userInput.length > MAX_INPUT_LENGTH) {
      return {
        status: 400,
        body: { error: `Input too long (max ${MAX_INPUT_LENGTH} characters).` }
      };
    }
  }

  const fullPrompt = buildPrompt(userInput || "", { learnerContext, refine });

  try {
    let raw;
    if (provider === "mock") {
      raw = await mockGenerate(simulate, learnerContext);
    } else if (provider === "gemini") {
      raw = await callGemini({
        apiKey: process.env.LLM_API_KEY,
        model: process.env.LLM_MODEL || "gemini-2.0-flash",
        prompt: fullPrompt
      });
    } else if (provider === "groq") {
      raw = await callGroq({
        apiKey: process.env.LLM_API_KEY,
        model: process.env.LLM_MODEL || "llama-3.3-70b-versatile",
        prompt: fullPrompt
      });
    } else {
      return { status: 500, body: { error: `Unknown LLM_PROVIDER "${provider}".` } };
    }

    // Return the raw text untouched. Parsing and shape validation happen on
    // the client (src/lib/validateResult.js) so every failure mode is
    // exercised the same way regardless of which provider produced the text.
    if (!simulate && typeof raw === "string" && raw.trim()) {
      responseCache.set(key, { raw, expiresAt: Date.now() + CACHE_TTL_MS });
      while (responseCache.size > CACHE_LIMIT) responseCache.delete(responseCache.keys().next().value);
    }
    return { status: 200, body: { raw, cached: false } };
  } catch (err) {
    // Never leak provider error details or the API key to the client.
    return { status: 502, body: { error: "The AI provider request failed." } };
  }
}

export function rateLimitKeyFromReq(req) {
  return req.ip || req.headers["x-forwarded-for"] || "anonymous";
}

export { isRateLimited };
