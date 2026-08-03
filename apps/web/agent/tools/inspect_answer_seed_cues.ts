import { defineTool } from "eve/tools";
import { z } from "zod";
import { inspectAnswerSeedCuePlan } from "../../src/ai/puzzle-agent/apex/cue-plan-preflight";
import type { AnswerSeedVisualCue } from "../../src/ai/puzzle-agent/apex/types";
import { PuzzleVisualSchema } from "../../src/ai/puzzle-agent/visual/composition";

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
    "Inspect a host-owned answer-seed cue contract: catalog validity, draft layers, and whether a board is missing required cues. Call before compose when an answer-first seed is reserved.",
  inputSchema: z.object({
    cues: z.array(CueSchema).optional(),
    visual: PuzzleVisualSchema.optional(),
  }),
  async execute(input) {
    return inspectAnswerSeedCuePlan({
      cues: input.cues as AnswerSeedVisualCue[] | undefined,
      visual: input.visual,
    });
  },
});
