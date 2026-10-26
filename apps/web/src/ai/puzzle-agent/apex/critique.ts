/**
 * Self-critique pass — LLM adversarial review before publish.
 */

import { generateAIObject } from "../../client";
import { AI_CONFIG } from "../../config";
import type { PuzzleVisual } from "../visual/composition";
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
  visual?: PuzzleVisual;
  /** Corroborated web-research brief about the answer. */
  answerResearch?: string;
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
Read the structured board as the authoritative visual: layout, layer order, relative positions, and text emphasis are clues. Name any plausible competing interpretation, the visible cue that distinguishes it, and a targeted repair if that cue is weak. Put cue-specific objections in flaws and actionable changes in reviseInstructions; do not invent a repair unrelated to the board.
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
        input.visual
          ? `Structured board: ${JSON.stringify(sanitizeCritiqueBoard(input.visual))}`
          : null,
        `Explanation: ${input.explanation}`,
        `Hints: ${input.hints.map((h, i) => `${i + 1}. ${h}`).join(" | ")}`,
        input.answerResearch
          ? [
              "",
              input.answerResearch,
              "Use this evidence: flag unfair obscurity only if the research supports it, and give reviseInstructions when the explanation or hints contradict the researched meaning or add unsourced history.",
            ].join("\n")
          : null,
        "",
        "Judge whether each pictured object would be instantly recognizable as a simple icon.",
        "Set overusedTrope=true if the answer/mechanism is a classic rebus cliché without a fresh twist.",
        "Score falseLeadQuality, ahaPredicted, creativityScore, iconRecognizability (0-100).",
        "Assess whether a competing interpretation survives the actual visible cue. Verdict ship only if proud to publish. If revise/reject, give concrete cue-specific reviseInstructions.",
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return {
      ...raw,
      source: "model",
      creativityScore: raw.creativityScore ?? 60,
      iconRecognizability: raw.iconRecognizability ?? 70,
      overusedTrope: raw.overusedTrope ?? false,
    };
  } catch {
    // Soft fallback — don't block the pipeline if critique model fails
    return {
      verdict: "revise",
      source: "fallback",
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

/** Strip SVG, images, prompts, and recognition metadata before sending board structure to critique. */
export function sanitizeCritiqueBoard(visual: PuzzleVisual) {
  return {
    layout: visual.layout,
    layers: visual.layers.map((layer) => {
      const position = {
        ...(layer.x !== undefined ? { x: layer.x } : {}),
        ...(layer.y !== undefined ? { y: layer.y } : {}),
      };
      switch (layer.kind) {
        case "text":
          return {
            kind: layer.kind,
            content: layer.content,
            emphasis: layer.emphasis,
            ...position,
          };
        case "pictogram":
          return { kind: layer.kind, concept: layer.concept, ...position };
        case "operator":
          return { kind: layer.kind, symbol: layer.symbol, ...position };
        case "image":
          return { kind: layer.kind, concept: layer.concept ?? layer.alt, ...position };
      }
    }),
    ...(visual.caption ? { caption: visual.caption } : {}),
  };
}
