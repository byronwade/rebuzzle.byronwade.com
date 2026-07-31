/**
 * Player simulation — predict wrong parses and fairness of the hint ladder.
 */

import { generateAIObject } from "../../client";
import { AI_CONFIG } from "../../config";
import { PlayerSimSchema, type PlayerSimResult } from "./types";

export async function simulatePlayerSolve(input: {
  rebusPuzzle: string;
  answer: string;
  explanation: string;
  hints: string[];
  techniqueId: string;
  tierLabel: string;
}): Promise<PlayerSimResult> {
  try {
    return await generateAIObject({
      modelType: "smart",
      temperature: AI_CONFIG.generation.temperature.balanced,
      schema: PlayerSimSchema,
      system: `You simulate clever-but-not-expert rebus players.
List tempting wrong parses a smart player might try first.
Judge whether the hint ladder unlocks the mechanism fairly.
estimatedSolveRate is 0–1 for the target audience of this tier.`,
      prompt: [
        `Simulate players for a ${input.tierLabel} rebus.`,
        `Board: ${input.rebusPuzzle}`,
        `Answer: ${input.answer}`,
        `Technique: ${input.techniqueId}`,
        `Explanation: ${input.explanation}`,
        `Hints: ${input.hints.map((h, i) => `${i + 1}. ${h}`).join(" | ")}`,
        "",
        "Return firstWrongParses (up to 5), likelySolvePath, fairness flags, estimatedSolveRate, confidence.",
      ].join("\n"),
    });
  } catch {
    return {
      firstWrongParses: [],
      likelySolvePath: "Simulation unavailable",
      hintUnlockOrderLooksFair: true,
      unfairReasons: [],
      estimatedSolveRate: 0.45,
      confidence: 0.2,
    };
  }
}

/**
 * Deterministic fairness heuristics layered on top of LLM sim.
 */
export function applyPlayerSimHeuristics(
  sim: PlayerSimResult,
  input: { answer: string; hints: string[]; tierLabel: string }
): PlayerSimResult {
  const unfairReasons = [...sim.unfairReasons];
  let hintUnlockOrderLooksFair = sim.hintUnlockOrderLooksFair;

  const answerLower = input.answer.toLowerCase();
  input.hints.slice(0, -1).forEach((h, i) => {
    if (h.toLowerCase().includes(answerLower)) {
      unfairReasons.push(`Hint ${i + 1} contains the full answer`);
      hintUnlockOrderLooksFair = false;
    }
  });

  // Impossible tiers should not estimate >70% solve without many hints
  if (input.tierLabel === "Impossible" && sim.estimatedSolveRate > 0.7) {
    return {
      ...sim,
      estimatedSolveRate: Math.min(sim.estimatedSolveRate, 0.55),
      hintUnlockOrderLooksFair,
      unfairReasons,
    };
  }

  return { ...sim, hintUnlockOrderLooksFair, unfairReasons };
}
