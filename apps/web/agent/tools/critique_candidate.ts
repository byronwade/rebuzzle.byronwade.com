import { defineTool } from "eve/tools";
import { z } from "zod";
import { critiqueCandidate } from "../../src/ai/puzzle-agent/apex/critique";

export default defineTool({
  description:
    "Adversarial editor critique — ship/revise/reject with aha + false-lead scores.",
  inputSchema: z.object({
    rebusPuzzle: z.string(),
    answer: z.string(),
    explanation: z.string(),
    hints: z.array(z.string()),
    techniqueId: z.string(),
    difficulty: z.number(),
    tierLabel: z.enum(["Hard", "Difficult", "Evil", "Impossible"]),
    unicodeFallback: z.string().optional(),
  }),
  async execute(input) {
    return critiqueCandidate(input);
  },
});
