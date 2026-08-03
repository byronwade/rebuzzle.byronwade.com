/**
 * Cheap cue-plan preflight — compose from host-owned seed cues before ToolLoop invent.
 *
 * Proves the answer-seed contract is catalog-grounded and composable without
 * paying for a creative invent loop. Failures here fail closed with zero model spend.
 */

import type { ComposePuzzleVisualResult } from "../visual/compose-visual";
import type { PuzzleVisual, VisualLayer } from "../visual/composition";
import { resolveCuratedPictogram } from "../visual/curated-pictograms";
import {
  answerSeedCuePlanIssues,
  formatAnswerSeedCuePlan,
  missingAnswerSeedCues,
} from "./answer-seed-cues";
import type { AnswerSeedVisualCue } from "./types";

function emojiForConcept(concept: string): string {
  // Share-string placeholder only — compose fills reviewed SVG + real fallback.
  const cleaned = concept
    .replace(/[^a-z0-9]+/gi, "")
    .slice(0, 2)
    .toUpperCase();
  return cleaned || "◆";
}

/**
 * Deterministic layer plan from host-owned answer-seed cues.
 */
export function layersFromAnswerSeedCues(cues: readonly AnswerSeedVisualCue[]): VisualLayer[] {
  return cues.map((cue): VisualLayer => {
    if (cue.kind === "catalog") {
      const resolved = resolveCuratedPictogram(cue.concept);
      const concept = resolved?.canonicalConcept ?? cue.concept;
      return {
        kind: "pictogram",
        concept,
        role: cue.role,
        emojiFallback: emojiForConcept(concept),
        ...(resolved
          ? {
              svg: resolved.svg,
              assetId: resolved.assetId,
              source: "catalog" as const,
            }
          : {}),
      };
    }
    if (cue.kind === "text") {
      return {
        kind: "text",
        content: cue.content,
        emphasis: "normal",
      };
    }
    return {
      kind: "operator",
      symbol: cue.symbol,
    };
  });
}

export type InspectAnswerSeedCuePlanResult = {
  plan: string;
  issues: string[];
  missingOnBoard: string[];
  layerPlan: VisualLayer[];
  catalogConcepts: string[];
  ready: boolean;
  guidance: string[];
};

/**
 * Model-facing inspector for an answer-seed cue contract (+ optional board check).
 */
export function inspectAnswerSeedCuePlan(input: {
  cues?: readonly AnswerSeedVisualCue[];
  visual?: PuzzleVisual;
}): InspectAnswerSeedCuePlanResult {
  const cues = input.cues ?? [];
  const issues = answerSeedCuePlanIssues(cues);
  const layerPlan = issues.length ? [] : layersFromAnswerSeedCues(cues);
  const missingOnBoard = input.visual ? missingAnswerSeedCues({ visual: input.visual, cues }) : [];
  const catalogConcepts = cues
    .filter(
      (cue): cue is Extract<AnswerSeedVisualCue, { kind: "catalog" }> => cue.kind === "catalog"
    )
    .map((cue) => cue.concept);

  const guidance: string[] = [];
  if (!cues.length) {
    guidance.push(
      "No cue plan provided — invent only when the host has not reserved an answer-first seed"
    );
  }
  if (issues.length) {
    guidance.push("Fix cue-plan issues before compose_puzzle_visual");
  } else if (cues.length) {
    guidance.push("Call compose_puzzle_visual with these exact layer concepts/text/operators");
    guidance.push("Do not substitute catalog concepts with vaguely related icons");
  }
  if (missingOnBoard.length) {
    guidance.push(`Board is still missing: ${missingOnBoard.join("; ")}`);
  }

  return {
    plan: formatAnswerSeedCuePlan(cues),
    issues,
    missingOnBoard,
    layerPlan,
    catalogConcepts,
    ready: issues.length === 0 && cues.length > 0 && missingOnBoard.length === 0,
    guidance,
  };
}

export type CuePlanPreflightResult = {
  ok: boolean;
  stage: "cue-plan" | "compose" | "cue-presence";
  issues: string[];
  inspection: InspectAnswerSeedCuePlanResult;
  composition: ComposePuzzleVisualResult | null;
};

/**
 * Host-side preflight: validate cues → compose deterministically → verify presence.
 */
export async function preflightComposeAnswerSeedCuePlan(input: {
  answer: string;
  targetDifficulty: number;
  techniqueId?: string;
  cues: readonly AnswerSeedVisualCue[];
  layout?: "row" | "stack" | "grid" | "overlay";
}): Promise<CuePlanPreflightResult> {
  const inspection = inspectAnswerSeedCuePlan({ cues: input.cues });
  if (!input.cues.length || inspection.issues.length) {
    return {
      ok: false,
      stage: "cue-plan",
      issues: inspection.issues.length ? inspection.issues : ["Answer-seed cue plan is empty"],
      inspection,
      composition: null,
    };
  }

  // Dynamic import keeps pure inspectors free of the AI SDK ESM graph in Jest.
  const { composePuzzleVisual } = await import("../visual/compose-visual");
  const composition = await composePuzzleVisual({
    answer: input.answer,
    targetDifficulty: input.targetDifficulty,
    techniqueId: input.techniqueId,
    layout: input.layout ?? "row",
    layers: inspection.layerPlan,
  });

  if (composition.issues.length) {
    return {
      ok: false,
      stage: "compose",
      issues: composition.issues,
      inspection,
      composition,
    };
  }

  const missing = missingAnswerSeedCues({
    visual: composition.visual,
    cues: input.cues,
  });
  if (missing.length) {
    return {
      ok: false,
      stage: "cue-presence",
      issues: missing,
      inspection: inspectAnswerSeedCuePlan({
        cues: input.cues,
        visual: composition.visual,
      }),
      composition,
    };
  }

  return {
    ok: true,
    stage: "cue-presence",
    issues: [],
    inspection: inspectAnswerSeedCuePlan({
      cues: input.cues,
      visual: composition.visual,
    }),
    composition,
  };
}
