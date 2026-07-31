import { defineTool } from "eve/tools";
import { z } from "zod";
import { buildGenerationBrief } from "../../src/ai/puzzle-agent/apex/curriculum";

export default defineTool({
  description:
    "Apex curriculum brief: diversity memory, learning digest, phrase-bank seeds, preferred techniques.",
  inputSchema: z.object({
    targetDifficulty: z.number(),
    puzzleType: z.string().optional(),
    theme: z.string().optional(),
    category: z.string().optional(),
    useLearningFeedback: z.boolean().optional(),
  }),
  async execute(input) {
    return buildGenerationBrief(input);
  },
});
