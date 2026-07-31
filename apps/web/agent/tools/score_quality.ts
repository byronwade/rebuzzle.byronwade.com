import { defineTool } from "eve/tools";
import { z } from "zod";
import { CandidatePuzzleSchema } from "../../src/ai/puzzle-agent/schemas";
import { scorePuzzleQuality } from "../../src/ai/puzzle-agent/tool-impl";
import { PuzzleVisualSchema } from "../../src/ai/puzzle-agent/visual/composition";

export default defineTool({
  description:
    "Score clarity/solvability/structure of a candidate. Aim for overall >= 74, funScore >= 68, known techniqueId, and a composed visual.",
  inputSchema: CandidatePuzzleSchema.extend({
    puzzleType: z.string().optional(),
    targetDifficulty: z.number().optional(),
    techniqueId: z.string().optional(),
    visual: PuzzleVisualSchema.optional(),
  }),
  async execute(input) {
    return scorePuzzleQuality(input);
  },
});
