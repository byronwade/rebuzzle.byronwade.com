import { defineTool } from "eve/tools";
import { z } from "zod";
import { CandidatePuzzleSchema } from "../../src/ai/puzzle-agent/schemas";
import { checkUniqueness } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Check semantic uniqueness against existing puzzles. Call after you have a full candidate.",
  inputSchema: CandidatePuzzleSchema.extend({
    puzzleType: z.string().optional(),
  }),
  async execute(input) {
    return checkUniqueness(input);
  },
});
