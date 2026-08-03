import { defineTool } from "eve/tools";
import { z } from "zod";
import { preflightComposeAnswerSeedCuePlan } from "../../src/ai/puzzle-agent/apex/cue-plan-preflight";
import type { AnswerSeedVisualCue } from "../../src/ai/puzzle-agent/apex/types";

const CueSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("catalog"),
    concept: z.string(),
    role: z.enum([
      "word-part",
      "phonetic-anchor",
      "semantic-anchor",
      "structural-anchor",
    ]),
  }),
  z.object({
    kind: z.literal("text"),
    content: z.string(),
    role: z.enum([
      "word-part",
      "phonetic-anchor",
      "semantic-anchor",
      "structural-anchor",
    ]),
  }),
  z.object({
    kind: z.literal("operator"),
    symbol: z.string(),
    role: z.literal("structural-anchor"),
  }),
]);

export default defineTool({
  description:
    "Cheap host preflight: compose a board deterministically from an answer-seed cue plan (no invent). Use to prove catalog cues compose before a creative rewrite.",
  inputSchema: z.object({
    answer: z.string(),
    targetDifficulty: z.number(),
    techniqueId: z.string().optional(),
    layout: z.enum(["row", "stack", "grid", "overlay"]).optional(),
    cues: z.array(CueSchema),
  }),
  async execute(input) {
    const result = await preflightComposeAnswerSeedCuePlan({
      ...input,
      cues: input.cues as AnswerSeedVisualCue[],
    });
    if (!result.ok) {
      throw new Error(
        `Cue-plan preflight failed (${result.stage}): ${result.issues.join("; ")}`
      );
    }
    return {
      ...result,
      publicationReady: true,
      visual: result.composition?.visual,
      unicodeFallback: result.composition?.visual.unicodeFallback,
    };
  },
});
