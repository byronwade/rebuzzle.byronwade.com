import { defineTool } from "eve/tools";
import { z } from "zod";
import { getDifficultyBrief } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Get the canonical difficulty tier brief: band, component budget, techniques, and what to avoid.",
  inputSchema: z.object({
    targetDifficulty: z.number().optional(),
    tier: z.enum(["hard", "difficult", "evil", "impossible"]).optional(),
  }),
  async execute(input) {
    return getDifficultyBrief(input);
  },
});
