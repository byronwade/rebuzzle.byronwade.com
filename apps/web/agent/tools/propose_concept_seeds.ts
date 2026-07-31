import { defineTool } from "eve/tools";
import { z } from "zod";
import { proposeConceptSeeds } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Brainstorm concept seeds matched to the difficulty tier (starting points, not final answers).",
  inputSchema: z.object({
    targetDifficulty: z.number(),
    theme: z.string().optional(),
    category: z.string().optional(),
    avoidAnswers: z.array(z.string()).optional(),
  }),
  async execute(input) {
    return proposeConceptSeeds(input);
  },
});
