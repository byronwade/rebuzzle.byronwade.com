import { defineTool } from "eve/tools";
import { z } from "zod";
import { CandidatePuzzleSchema } from "../../src/ai/puzzle-agent/schemas";
import { validatePuzzleCandidate } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Validate a candidate against the puzzle-type schema and hard rules before uniqueness/quality.",
  inputSchema: CandidatePuzzleSchema.extend({
    puzzleType: z.string().optional(),
  }),
  async execute(input) {
    return validatePuzzleCandidate(input);
  },
});
