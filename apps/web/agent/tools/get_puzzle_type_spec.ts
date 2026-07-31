import { defineTool } from "eve/tools";
import { z } from "zod";
import { getPuzzleTypeSpec } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Load generation rules, categories, and guidance for a puzzle type (rebus, riddle, etc.).",
  inputSchema: z.object({
    puzzleType: z.string().describe("Puzzle type id, e.g. rebus"),
  }),
  async execute(input) {
    return getPuzzleTypeSpec(input);
  },
});
