# Recall — an adaptive study assistant

> Paste your notes or a topic. Get flashcards, quiz questions and a summary as **interactive components** (not a chat). The app tracks what you get wrong and generates the next set around your weak spots.

Built for the Flam Frontend Internship assignment (React + LLM, structured output, robust handling of bad AI output).

**Live demo:** [Recall on Vercel](https://quizapp-ruddy-two.vercel.app/) · **Deployment:** Vercel · **Screen recording:** Not recorded

---

## Status

The app is deployed on Vercel, and email/password sign-in is enabled with Supabase environment variables. The app defaults to a **mock LLM provider** unless `LLM_PROVIDER` is configured for a live provider. Remaining release work is to verify the account and cloud-sync flow and record a short demo.

**Core**
- [x] Free-form text input → backend proxy → LLM → validated JSON → UI
- [x] Flashcard deck (flip, next/prev)
- [x] Quiz (MCQ, score, per-option feedback)
- [x] Re-test wrong answers
- [x] Loading / error / empty states, retry
- [x] All failure modes handled (see table below) — unit-tested in `tests/`
- [x] Mobile layout (single column, responsive type/spacing)

**Stretch (treated as must-do)**
- [x] Mixed block types (flashcard, mcq, summary)
- [x] Refinement loop (follow-up prompt edits the current set) with undo
- [x] Save / reload sessions (localStorage; Supabase when signed in) + JSON export/import
- [x] Polish: dark mode, flip animation, keyboard navigation
- [x] Streaming responses from Gemini, Groq and the mock provider; output is validated before rendering

**Personalization**
- [x] Learner model (per-topic accuracy, missed questions, scheduled Leitner review)
- [x] "Focus on my weak spots" generation
- [x] Per-topic level (beginner/intermediate/advanced) drives both question difficulty and explanation depth, on every generation — not just the weak-spots button
- [x] Personalized wrong-answer explanations (`optionFeedback`), depth-matched to level
- [x] **Optional accounts (Supabase):** sync learner stats, scheduled reviews and current study set across devices; guest mode (localStorage) needs no setup

> Accounts are optional at runtime rather than required: without `VITE_SUPABASE_*` env vars set, there's no sign-in UI and the app runs in guest mode (localStorage). Set them and run `supabase/schema.sql` to turn accounts on.

---

## How it works

```
Browser (React)                     Backend (Express / serverless)         LLM provider
───────────────                     ───────────────────────────           ────────────
PromptInput ──► lib/api.js ──POST /api/generate──► server/generate.js ──► Gemini / Groq
                                       │  holds API key, rate-limits,        (or a mock
                                       │  builds the strict prompt            provider)
                                       ▼
ResultView ◄── validateResult.js ◄── raw text
   │              (zod, per-block)
   ├─ FlashcardDeck
   ├─ Quiz
   └─ SummaryBlock
```

- The **API key never reaches the browser**. `src/lib/api.js` is the only place the frontend talks to the network, and it only ever calls our own `/api/generate`.
- The model is asked for **JSON only**. Nothing it returns is rendered until it has been parsed and validated in `src/lib/validateResult.js`.
- The UI is driven entirely by React state built from validated data — never by printing the model's raw text.

## Data shape

```json
{
  "title": "Photosynthesis basics",
  "blocks": [
    {
      "type": "flashcard",
      "id": "c1",
      "topic": "Light reactions",
      "difficulty": "easy",
      "question": "Where do the light reactions occur?",
      "answer": "In the thylakoid membranes of the chloroplast."
    },
    {
      "type": "mcq",
      "id": "q1",
      "topic": "Calvin cycle",
      "difficulty": "medium",
      "question": "Which molecule is fixed in the Calvin cycle?",
      "options": ["O2", "CO2", "N2", "H2O"],
      "correctIndex": 1,
      "explanation": "CO2 is fixed by RuBisCO.",
      "optionFeedback": ["explains why O2 is wrong", "", "explains why N2 is wrong", "explains why H2O is wrong"]
    },
    { "type": "summary", "id": "s1", "points": ["...", "..."] }
  ]
}
```

`optionFeedback[i]` explains why option *i* is a common misconception (empty string for the correct one). The exact contract lives in `server/prompt.js` (what we ask the model for) and `src/lib/validateResult.js` (what we actually accept) — keep those two in sync if you change the shape.

## Handling bad AI output

Validation lives in `src/lib/validateResult.js`, separate from the UI so it's easy to test and reason about on its own. Covered by `tests/validateResult.test.mjs`.

| Failure | What happens |
|---|---|
| Malformed JSON | Strip a ```` ```json ```` fence if present, try to parse; if it still fails → error state with **Retry** |
| Valid JSON, wrong shape | zod validation. Invalid blocks are **dropped individually**; valid ones are shown with a note ("N items were skipped"). If nothing valid remains → error state |
| Semantically bad block | e.g. MCQ with `correctIndex` out of range, duplicate options, too few options → that block is dropped |
| Empty response | Treated as a failure, never as an empty-but-valid result |
| Slow response | Loading state, then a "taking longer than usual" message after ~6s, hard timeout via `AbortController` at 30s |
| Failed request (network, 429, 5xx) | Friendly error + Retry. Raw provider errors are never shown to the user |
| Stale response | A request-id guard **and** aborting the previous in-flight request, so a slow old response can never overwrite a newer one |

**Try it yourself:** open the app with `?debug=1` in the URL (e.g. `http://localhost:5173/?debug=1`) to reveal a "Simulate response" panel that forces each of these cases on demand — this is what you'd use for your screen recording.

## Personalization

There are no profile forms — the only inputs are the text box and the learner's own behavior inside the app.

Open **Your progress** from the app navigation to see the learning dashboard without interrupting the Study page. It shows overall accuracy, topics practiced, level counts, reviews due, and a per-topic table with correct/attempted, accuracy, and current level. The quiz displays its score after each answer. Levels are automatic: below 40% is beginner, 40–74% is intermediate, and 75% or higher is advanced. Beginner topics receive fundamentals-first instructions and easier questions; advanced topics receive harder questions and more concise, technical explanations. There is no manual score or difficulty entry; scores come from answered multiple-choice questions.

**Learner model** (`src/hooks/useLearnerProfile.js`, persisted to `localStorage` for guests and Supabase for signed-in users):

```json
{
  "topics": { "Calvin cycle": { "attempts": 6, "correct": 2 } },
  "missed": { "q1": { "box": 0, "dueAt": "2026-01-02T00:00:00.000Z" } }
}
```

- **Level per topic:** `useLearnerProfile` computes beginner/intermediate/advanced per topic from accuracy (`<40%` / `<75%` / else). This is sent with **every** generate and refine call, not just the weak-spots button — so if a new prompt touches a topic the learner has quiz history in, the model calibrates automatically.
- **Difficulty + explanation depth:** the prompt (`server/prompt.js`) tells the model to write easier questions and plain-language, fundamentals-first explanations for beginner topics, and more concise, technical explanations for advanced ones (see the "level per topic" instruction it builds).
- **Weak-spot generation:** "Focus on my weak spots" additionally asks the model to target the lowest-accuracy topics specifically.
- **Spaced repetition:** missed quiz items return after 10 minutes; correct answers advance through 1, 3, 7, 14 and 30 day intervals. Due items appear in the scheduled review queue.
- **Prompt hygiene:** the learner summary and user text are passed as clearly delimited data, never as instructions to the model.

### Optional accounts (Supabase)

- Progress is grouped by study-set title (subject), then topic. For an existing Supabase project, run `supabase/migrations/20260925_learner_topic_subjects.sql` in the SQL editor to enable subject-specific topic scores; existing rows are retained under **Previously studied**.

- **Guest mode (default):** no env vars set → no sign-in UI, learner profile lives in `localStorage`, exactly like the original version.
- **Signed in:** set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env` and run `supabase/schema.sql` once in your Supabase project's SQL editor. A "Sign in" button appears with email/password sign-in, account creation, and password reset. If email confirmation is enabled in Supabase, new users confirm their address before signing in. Existing magic-link users can use **Forgot password?** to set a password for their account. Once signed in, the per-topic accuracy that drives levels is read from and written to the `learner_topics` table instead of localStorage, so it follows the account across devices/browsers.
- In Supabase Auth **URL Configuration**, use a publicly accessible production URL as the Site URL and allow the local development URL (`http://localhost:5173/**`). Sign-up and password recovery return to the origin where the flow started; protected Vercel preview deployments require Vercel team access and should not be used as the public Site URL.
- Signed-in accounts sync per-topic accuracy, scheduled review items and the current study set. Guest accounts keep these locally.
- **Security:** the Supabase anon key is safe to expose in the browser by design. What actually protects one user's data from another's is Row Level Security, defined in `supabase/schema.sql` — every policy checks `auth.uid() = user_id`.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Space` / `Enter` | Flip the current flashcard |
| `←` / `→` | Previous / next flashcard |
| `1`–`4` | Choose a quiz option |

## Getting started

**Requirements:** Node 20.19+ or 22.12+.

```bash
npm install
cp .env.example .env
npm start        # runs the API server and the Vite dev server together
```

Open http://localhost:5173 — it works immediately with `LLM_PROVIDER=mock` (the
default), no key required, and with no sign-in UI (guest mode). That's a
built-in fake responder so you can build and demo the whole UI, including
every failure state, for free.

To use a real model, edit `.env`:

```
LLM_PROVIDER=gemini
LLM_API_KEY=your-key-here
LLM_MODEL=gemini-2.0-flash
PORT=8787
```

Gemini (`aistudio.google.com/apikey`) and Groq both have free tiers — set
`LLM_PROVIDER=groq` and `LLM_MODEL=llama-3.3-70b-versatile` to use Groq instead.

To also enable accounts (optional, see "Optional accounts" above), add:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

after running `supabase/schema.sql` in your project's SQL editor.

> `npm start` uses `concurrently` to run the Vite dev server and the local
> Express API together. In production, the same request-handling logic in
> `server/generate.js` runs as a Vercel serverless function via `api/generate.js`
> — the GitHub `main` branch is connected to Vercel for deployments. Set the
> required environment variables in the Vercel project settings, and
> Vite's dev-only proxy in `vite.config.js` is simply unused in prod (Vercel
> routes `/api/*` to the function automatically).

## Usage

1. Paste notes or type a topic (e.g. "Photosynthesis" or your own lecture notes).
2. Click **Generate study set**. Flip through the flashcards, then take the quiz.
3. Missed questions collect into **Re-test wrong answers** at the end of the quiz.
4. Use **Refine** to edit the current set in place ("make these harder", "add 3 more on the Calvin cycle") instead of starting over. **Undo last refine** restores the previous version.
5. Once you have quiz history, **Focus on my weak spots** generates a new set targeted at your lowest-accuracy topics.
6. Sessions save automatically to this browser; use **Export/Import session** for a JSON backup or to move a session between browsers.

## Project structure

```
recall/
├── src/
│   ├── components/
│   │   ├── PromptInput.jsx       # free-form input, refine box, weak-spots, debug panel
│   │   ├── ResultView.jsx        # tabs; routes each block type to its component
│   │   ├── FlashcardDeck.jsx
│   │   ├── Quiz.jsx
│   │   ├── SummaryBlock.jsx
│   │   ├── ErrorState.jsx        # shared error + retry UI
│   │   ├── LoadingState.jsx
│   │   ├── AuthPanel.jsx         # email/password sign-in and account creation
│   │   └── ReviewDue.jsx         # scheduled review quiz
│   ├── hooks/
│   │   ├── useGenerate.js        # request lifecycle: loading/slow/error, abort, stale-id guard
│   │   ├── useSupabaseAuth.js    # email/password session state; no-ops without Supabase configured
│   │   ├── useCloudSession.js    # current-session sync for signed-in users
│   │   └── useLearnerProfile.js  # per-topic accuracy + level; cloud (Supabase) or local fallback
│   ├── lib/
│   │   ├── api.js                # the only place the frontend calls the LLM backend
│   │   ├── validateResult.js     # parse + zod validation, per-block filtering
│   │   ├── storage.js            # localStorage save/load/export/import
│   │   ├── reviewSchedule.js     # Leitner interval progression and due-item selection
│   │   ├── interaction.js        # quiz answer and flashcard navigation logic
│   │   └── supabaseClient.js     # optional Supabase client; null when not configured
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── server/
│   ├── prompt.js                 # builds the strict prompt: shape, level calibration, weak-spots
│   ├── generate.js                # framework-agnostic handler: calls the provider, rate-limits
│   ├── mockProvider.js           # fake responder for LLM_PROVIDER=mock, incl. failure simulation
│   └── dev-server.js             # local Express wrapper around generate.js
├── api/
│   └── generate.js               # Vercel serverless entry, reuses server/generate.js
├── supabase/
│   └── schema.sql                # optional: learner_topics, learner_reviews, study_sessions + RLS
├── tests/
│   ├── validateResult.test.mjs
│   ├── components.test.mjs
│   ├── interaction.test.mjs
│   ├── reviewSchedule.test.mjs
│   └── server.test.mjs           # run with `npm test`
├── .env.example
└── README.md
```

## Design decisions

- **Per-block validation** instead of all-or-nothing: one malformed card shouldn't throw away an otherwise-good set.
- **Refinement sends the full previous result back to the model and asks for the full updated result** (not a diff), because diffs generated by an LLM are far less reliable than a complete object that gets re-validated the same way as any other response.
- **Validation is fully separate from rendering** (`validateResult.js` has no React/DOM dependency) so it's unit-testable on its own — see `tests/`.
- **Server-side limits:** max input length, a small per-IP rate limiter, and a fixed system prompt so user text can't override the required output format.
- **Mock provider by default:** lets the whole UI, including every failure path, be built and demoed without spending API credits or needing a key.

## AI usage note

OpenAI Codex assisted with implementing and extending this project, including streaming, scheduled review, Supabase sync, caching and automated tests. Review the generated code and verify the live provider and account flows before submission.

## Known limitations

- Free-tier LLM rate limits apply when using Gemini/Groq — the mock provider has none.
- The model occasionally produces shallower questions for very short input; longer notes give better results.
- Guest sessions are per-browser (localStorage); signed-in accounts sync the current session.

- The in-memory response cache and rate limiter reset when the server process restarts.

_Add anything else you find while testing._

## Time spent

| Area | Time |
|---|---|
| Schema, prompt design | |
| Backend proxy + validation | |
| Flashcards, quiz, re-test | |
| Failure states + mobile | |
| Refinement, save/reload, polish | |
| Personalization | |
| README, deploy, recording | |
| **Total** | |

## Remaining release steps

- Verify Supabase email/password sign-in and account creation end to end. Confirm the Email provider is enabled in Supabase Auth and run `supabase/schema.sql` if it has not already been applied.
- Confirm the production LLM provider works. The mock provider works without an API key; Gemini or Groq needs the matching `LLM_PROVIDER`, `LLM_API_KEY`, and `LLM_MODEL` values in Vercel.
- Record a short demo that exercises generation, scheduled review, refinement and recovery from malformed output.





