/**
 * Cheap cue-plan preflight — compose from host-owned seed cues before ToolLoop invent.
 *
 * Proves the answer-seed contract is catalog-grounded and composable without
 * paying for a creative invent loop. Failures here fail closed with zero model spend.
 */

import type { ComposePuzzleVisualResult } from "../visual/compose-visual";
import type { PuzzleVisual, VisualLayer } from "../visual/composition";
import {
  answerSeedCuePlanIssues,
  formatAnswerSeedCuePlan,
  missingAnswerSeedCues,
} from "./answer-seed-cues";
import { composeRuleGraph, type PuzzleLayoutMode, type RuleGraphResult } from "./rule-graph";
import type { AnswerSeedVisualCue } from "./types";

/**
 * Deterministic layer plan from host-owned answer-seed cues.
 * Prefer composeRuleGraph when a technique is known.
 */
export function layersFromAnswerSeedCues(
  cues: readonly AnswerSeedVisualCue[],
  techniqueId?: string,
  answer?: string
): VisualLayer[] {
  return composeRuleGraph({ cues, techniqueId, answer }).layers;
}

export type InspectAnswerSeedCuePlanResult = {
  plan: string;
  issues: string[];
  missingOnBoard: string[];
  layerPlan: VisualLayer[];
  layout: PuzzleLayoutMode;
  ruleGraph: RuleGraphResult;
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
  techniqueId?: string;
  answer?: string;
}): InspectAnswerSeedCuePlanResult {
  const cues = input.cues ?? [];
  const issues = answerSeedCuePlanIssues(cues);
  const ruleGraph = issues.length
    ? {
        layers: [] as VisualLayer[],
        layout: "row" as const,
        applied: false,
        techniqueId: input.techniqueId,
        rules: ["skipped:invalid-cues"],
      }
    : composeRuleGraph({
        cues,
        techniqueId: input.techniqueId,
        answer: input.answer,
      });
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
    guidance.push(`Use layout=${ruleGraph.layout} from the rule-graph template`);
    guidance.push("Do not substitute catalog concepts with vaguely related icons");
    if (ruleGraph.applied) {
      guidance.push(`Rule-graph applied: ${ruleGraph.rules.join("; ")}`);
    }
  }
  if (missingOnBoard.length) {
    guidance.push(`Board is still missing: ${missingOnBoard.join("; ")}`);
  }

  return {
    plan: formatAnswerSeedCuePlan(cues),
    issues,
    missingOnBoard,
    layerPlan: ruleGraph.layers,
    layout: ruleGraph.layout,
    ruleGraph,
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
 * Host-side preflight: validate cues → rule-graph → compose → verify presence.
 */
export async function preflightComposeAnswerSeedCuePlan(input: {
  answer: string;
  targetDifficulty: number;
  techniqueId?: string;
  cues: readonly AnswerSeedVisualCue[];
  layout?: PuzzleLayoutMode;
}): Promise<CuePlanPreflightResult> {
  const inspection = inspectAnswerSeedCuePlan({
    cues: input.cues,
    techniqueId: input.techniqueId,
    answer: input.answer,
  });
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
    // Explicit caller layout wins; otherwise use deterministic rule-graph layout.
    layout: input.layout ?? inspection.layout,
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
        techniqueId: input.techniqueId,
        answer: input.answer,
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
      techniqueId: input.techniqueId,
      answer: input.answer,
    }),
    composition,
  };
}
