import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  applyPlayerSimHeuristics,
  simulatePlayerSolve,
} from "../../src/ai/puzzle-agent/apex/player-sim";

export default defineTool({
  description:
    "Simulate clever players: wrong parses, hint fairness, estimated solve rate.",
  inputSchema: z.object({
    rebusPuzzle: z.string(),
    answer: z.string(),
    explanation: z.string(),
    hints: z.array(z.string()),
    techniqueId: z.string(),
    tierLabel: z.enum(["Hard", "Difficult", "Evil", "Impossible"]),
  }),
  async execute(input) {
    const sim = await simulatePlayerSolve(input);
    return applyPlayerSimHeuristics(sim, {
      answer: input.answer,
      hints: input.hints,
      tierLabel: input.tierLabel,
    });
  },
});
