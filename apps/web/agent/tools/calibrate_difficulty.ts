import { defineTool } from "eve/tools";
import { z } from "zod";
import { CandidatePuzzleSchema } from "../../src/ai/puzzle-agent/schemas";
import { calibratePuzzleDifficulty } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Calibrate the difficulty rating for a candidate using type config or AI calibration.",
  inputSchema: CandidatePuzzleSchema.extend({
    puzzleType: z.string().optional(),
  }),
  async execute(input) {
    return calibratePuzzleDifficulty(input);
  },
});
