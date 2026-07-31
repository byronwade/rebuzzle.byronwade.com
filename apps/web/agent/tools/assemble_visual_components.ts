import { defineTool } from "eve/tools";
import { z } from "zod";
import { assembleVisualComponents } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Analyze a candidate visual: component count vs tier budget, technique tips, fun score.",
  inputSchema: z.object({
    answer: z.string(),
    rebusPuzzle: z.string(),
    techniqueId: z.string().optional(),
    targetDifficulty: z.number(),
  }),
  async execute(input) {
    return assembleVisualComponents(input);
  },
});
