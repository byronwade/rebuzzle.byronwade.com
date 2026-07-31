import { defineTool } from "eve/tools";
import { z } from "zod";
import { CandidatePuzzleSchema } from "../../src/ai/puzzle-agent/schemas";
import { scorePuzzleQuality } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Score clarity/solvability/structure of a candidate. Aim for overall >= 70 and no blocking issues.",
  inputSchema: CandidatePuzzleSchema.extend({
    puzzleType: z.string().optional(),
  }),
  async execute(input) {
    return scorePuzzleQuality(input);
  },
});
