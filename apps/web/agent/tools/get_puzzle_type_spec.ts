import { defineTool } from "eve/tools";
import { z } from "zod";
import { getPuzzleTypeSpec } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Load generation rules and the target difficulty tier for a puzzle type.",
  inputSchema: z.object({
    puzzleType: z.string().describe("Puzzle type id, e.g. rebus"),
    targetDifficulty: z.number().optional(),
  }),
  async execute(input) {
    return getPuzzleTypeSpec(input);
  },
});
