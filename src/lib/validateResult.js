import { z } from "zod";

const FlashcardBlock = z.object({
  type: z.literal("flashcard"),
  id: z.string().min(1),
  topic: z.string().min(1).default("General"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  question: z.string().min(1),
  answer: z.string().min(1)
});

const McqBlock = z
  .object({
    type: z.literal("mcq"),
    id: z.string().min(1),
    topic: z.string().min(1).default("General"),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(6),
    correctIndex: z.number().int(),
    explanation: z.string().default(""),
    optionFeedback: z.array(z.string()).optional()
  })
  // Structural rules a type schema alone can't express: index in range,
  // no duplicate options, feedback array (if present) the same length.
  .refine((b) => b.correctIndex >= 0 && b.correctIndex < b.options.length, {
    message: "correctIndex out of range"
  })
  .refine((b) => new Set(b.options.map((o) => o.trim().toLowerCase())).size === b.options.length, {
    message: "duplicate options"
  })
  .refine((b) => !b.optionFeedback || b.optionFeedback.length === b.options.length, {
    message: "optionFeedback length mismatch"
  })
  .transform((b) => ({
    ...b,
    optionFeedback: b.optionFeedback ?? b.options.map(() => "")
  }));

const SummaryBlock = z.object({
  type: z.literal("summary"),
  id: z.string().min(1),
  points: z.array(z.string().min(1)).min(1)
});

// Not z.discriminatedUnion: McqBlock carries .refine()/.transform() effects on
// top of its object shape, which discriminatedUnion can't introspect for the
// literal "type" key. A plain union tries each member and is just as safe
// here since we validate one block at a time.
const Block = z.union([FlashcardBlock, McqBlock, SummaryBlock]);

const ResultShape = z.object({
  title: z.string().min(1).default("Study set"),
  blocks: z.array(z.unknown()).default([])
});

/**
 * Strip a ```json ... ``` fence if the model wrapped its output in one,
 * despite being asked not to.
 */
function stripFences(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : text;
}

/**
 * @param {string} raw the raw text returned by the LLM
 * @returns {{ ok: true, data: {title:string, blocks:object[]}, droppedCount: number }
 *          | { ok: false, reason: "empty" | "malformed-json" | "wrong-shape" }}
 */
export function validateResult(raw) {
  if (!raw || !raw.trim()) {
    return { ok: false, reason: "empty" };
  }

  let parsed;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch {
    return { ok: false, reason: "malformed-json" };
  }

  const shape = ResultShape.safeParse(parsed);
  if (!shape.success) {
    return { ok: false, reason: "wrong-shape" };
  }

  const validBlocks = [];
  let droppedCount = 0;
  for (const candidate of shape.data.blocks) {
    const result = Block.safeParse(candidate);
    if (result.success) {
      validBlocks.push(result.data);
    } else {
      droppedCount += 1;
    }
  }

  if (validBlocks.length === 0) {
    return { ok: false, reason: "wrong-shape" };
  }

  return {
    ok: true,
    data: { title: shape.data.title, blocks: validBlocks },
    droppedCount
  };
}
