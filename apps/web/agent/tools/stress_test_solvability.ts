import { defineTool } from "eve/tools";
import { z } from "zod";
import { CandidatePuzzleSchema } from "../../src/ai/puzzle-agent/schemas";
import { stressTestSolvability } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Fairness check: would a clever player solve this with the hint ladder?",
  inputSchema: CandidatePuzzleSchema.extend({
    puzzleType: z.string().optional(),
    targetDifficulty: z.number().optional(),
  }),
  async execute(input) {
    return stressTestSolvability(input);
  },
});
