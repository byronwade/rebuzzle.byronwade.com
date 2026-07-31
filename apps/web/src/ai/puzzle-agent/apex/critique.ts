/**
 * Self-critique pass — LLM adversarial review before publish.
 */

import { generateAIObject } from "../../client";
import { AI_CONFIG } from "../../config";
import { CritiqueSchema, type CritiqueResult } from "./types";

export async function critiqueCandidate(input: {
  rebusPuzzle: string;
  answer: string;
  explanation: string;
  hints: string[];
  techniqueId: string;
  difficulty: number;
  tierLabel: string;
  unicodeFallback?: string;
}): Promise<CritiqueResult> {
  try {
    return await generateAIObject({
      modelType: "smart",
      temperature: AI_CONFIG.generation.temperature.factual,
      schema: CritiqueSchema,
      system: `You are an adversarial rebus editor for Rebuzzle.
Reject lazy emoji salad, answer leaks, unfair obscurity, and weak aha moments.
Ship only puzzles with a clean mapping and a satisfying click.
Family-friendly. Be specific and ruthless but fair.`,
      prompt: [
        `Critique this ${input.tierLabel} candidate (difficulty ${input.difficulty}/10).`,
        `Display: ${input.unicodeFallback || input.rebusPuzzle}`,
        `Answer: ${input.answer}`,
        `Technique: ${input.techniqueId}`,
        `Explanation: ${input.explanation}`,
        `Hints: ${input.hints.map((h, i) => `${i + 1}. ${h}`).join(" | ")}`,
        "",
        "Score falseLeadQuality (0-100) and ahaPredicted (0-100).",
        "Verdict ship only if you'd be proud to publish it nationally.",
        "If revise/reject, give concrete reviseInstructions.",
      ].join("\n"),
    });
  } catch {
    // Soft fallback — don't block the pipeline if critique model fails
    return {
      verdict: "revise",
      summary: "Critique unavailable — treat as provisional",
      strengths: [],
      flaws: ["Automated critique failed; rely on deterministic gates"],
      reviseInstructions: ["Re-check answer leak, technique fit, and hint progression"],
      falseLeadQuality: 50,
      ahaPredicted: 55,
    };
  }
}
