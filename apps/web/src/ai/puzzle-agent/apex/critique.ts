/**
 * Self-critique pass — LLM adversarial review before publish.
 */

import { generateAIObject } from "../../client";
import { AI_CONFIG } from "../../config";
import { OVERUSED_REBUS_TROPES } from "../visual/icon-features";
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
  pictogramConcepts?: string[];
  /** Truncated SVG snippets for icon judgment */
  pictogramSvgs?: string[];
  iconRecognitionNotes?: string[];
}): Promise<CritiqueResult> {
  try {
    const svgNotes = (input.pictogramSvgs ?? [])
      .slice(0, 4)
      .map((svg, i) => `Icon ${i + 1} SVG (truncated):\n${svg.slice(0, 900)}`)
      .join("\n\n");

    const raw = await generateAIObject({
      modelType: "smart",
      temperature: AI_CONFIG.generation.temperature.balanced,
      schema: CritiqueSchema,
      system: `You are an adversarial rebus editor for a national daily (Rebuzzle).
Reject lazy emoji salad, unreadable/vague icons, answer leaks, unfair obscurity, weak aha moments, and overused tropes (${OVERUSED_REBUS_TROPES.slice(0, 6).join(", ")}) unless the twist is genuinely new.
Craft standards (research-backed): backform from the answer; ONE primary device (compound/position/size/phonetic/equation/literal); a fair board has one intended reading once seen; hard rubrics need kinder hints.
Demand: concrete pictogram nouns with unmistakable silhouettes, fair progressive hints, family-friendly.
Score creativityScore (mechanism inventiveness, not just uniqueness) and iconRecognizability (0–100).
If Prior icon recognition notes say FAILED, iconRecognizability must be ≤40 and verdict cannot be ship.
Ship only if you'd be proud to publish nationally AND creativityScore ≥ 65 AND icons would be recognizable.
Be specific and ruthless but fair.`,
      prompt: [
        `Critique this ${input.tierLabel} candidate (difficulty ${input.difficulty}/10).`,
        `Display: ${input.unicodeFallback || input.rebusPuzzle}`,
        `Answer: ${input.answer}`,
        `Technique: ${input.techniqueId}`,
        input.pictogramConcepts?.length
          ? `Pictogram concepts: ${input.pictogramConcepts.join(", ")}`
          : null,
        input.iconRecognitionNotes?.length
          ? `Prior icon recognition: ${input.iconRecognitionNotes.join("; ")}`
          : null,
        svgNotes || null,
        `Explanation: ${input.explanation}`,
        `Hints: ${input.hints.map((h, i) => `${i + 1}. ${h}`).join(" | ")}`,
        "",
        "Judge whether each pictured object would be instantly recognizable as a simple human-sketched icon.",
        "Set overusedTrope=true if the answer/mechanism is a classic rebus cliché without a fresh twist.",
        "Score falseLeadQuality, ahaPredicted, creativityScore, iconRecognizability (0-100).",
        "Verdict ship only if proud to publish. If revise/reject, give concrete reviseInstructions focused on mechanism + icon clarity.",
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
