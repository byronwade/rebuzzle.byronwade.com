/**
 * Self-critique pass — LLM adversarial review before publish.
 */

import { generateAIObject } from "../../client";
import { AI_CONFIG } from "../../config";
import { OVERUSED_REBUS_TROPES } from "../visual/icon-features";
import { CritiqueProviderSchema, type CritiqueResult } from "./types";

export async function critiqueCandidate(input: {
  rebusPuzzle: string;
  answer: string;
  explanation: string;
  hints: string[];
  techniqueId: string;
  difficulty: number;
  tierLabel: string;
  unicodeFallback?: string;
  pictogramConcepts?: string[];
}): Promise<CritiqueResult> {
  try {
    const raw = await generateAIObject({
      operation: "puzzle-critique",
      modelType: "smart",
      temperature: AI_CONFIG.generation.temperature.balanced,
      schema: CritiqueProviderSchema,
      system: `You are an adversarial rebus editor for a national daily (Rebuzzle).
Reject lazy emoji salad, unreadable/vague icons, answer leaks, unfair obscurity, weak aha moments, and overused tropes (${OVERUSED_REBUS_TROPES.slice(0, 6).join(", ")}) unless the twist is genuinely new.
Demand: one clean clever mechanism, concrete pictogram nouns a human can sketch, fair progressive hints, family-friendly.
Score creativityScore (mechanism inventiveness, not just uniqueness) and iconRecognizability (0–100).
Ship only if you'd be proud to publish nationally AND creativityScore ≥ 62 AND icons would be recognizable.
Be specific and ruthless but fair.`,
      prompt: [
        `Critique this ${input.tierLabel} candidate (difficulty ${input.difficulty}/10).`,
        `Display: ${input.unicodeFallback || input.rebusPuzzle}`,
        `Answer: ${input.answer}`,
        `Technique: ${input.techniqueId}`,
        input.pictogramConcepts?.length
          ? `Pictogram concepts: ${input.pictogramConcepts.join(", ")}`
          : null,
        `Explanation: ${input.explanation}`,
        `Hints: ${input.hints.map((h, i) => `${i + 1}. ${h}`).join(" | ")}`,
        "",
        "Judge whether each pictured object would be instantly recognizable as a simple icon.",
        "Set overusedTrope=true if the answer/mechanism is a classic rebus cliché without a fresh twist.",
        "Score falseLeadQuality, ahaPredicted, creativityScore, iconRecognizability (0-100).",
        "Verdict ship only if proud to publish. If revise/reject, give concrete reviseInstructions.",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return {
      ...raw,
      creativityScore: raw.creativityScore ?? 60,
      iconRecognizability: raw.iconRecognizability ?? 70,
      overusedTrope: raw.overusedTrope ?? false,
    };
  } catch {
    // Soft fallback — don't block the pipeline if critique model fails
    return {
      verdict: "revise",
      summary: "Critique unavailable — treat as provisional",
      strengths: [],
      flaws: ["Automated critique failed; rely on deterministic gates"],
      reviseInstructions: [
        "Re-check answer leak, technique fit, icon recognizability, and hint progression",
      ],
      falseLeadQuality: 50,
      ahaPredicted: 55,
      creativityScore: 55,
      iconRecognizability: 55,
      overusedTrope: false,
    };
  }
}
