import { defineTool } from "eve/tools";
import { z } from "zod";
import { craftHintLadder } from "../../src/ai/puzzle-agent/tool-impl";

export default defineTool({
  description:
    "Build a progressive hint ladder styled for the difficulty tier (vague → specific).",
  inputSchema: z.object({
    answer: z.string(),
    explanation: z.string(),
    rebusPuzzle: z.string(),
    targetDifficulty: z.number(),
    existingHints: z.array(z.string()).optional(),
  }),
  async execute(input) {
    return craftHintLadder(input);
  },
});
