/**
 * Critique-locked repair specialist.
 *
 * Formalizes the Apex ≤1 revise lane: preserve answer + cue plan, rewrite the
 * board only to satisfy model critique instructions. No re-seed invent.
 */

import type { PuzzleGenerationParams } from "../run-generation";
import type { AnswerSeedVisualCue } from "./types";

export type CritiqueRepairRequest = {
  answer: string;
  answerSeedCuePlan?: readonly AnswerSeedVisualCue[];
  techniqueId: string;
  reviseInstructions: readonly string[];
  preferredTechniques?: string[];
  avoidTechniques?: string[];
  bannedAnswerKeys?: string[];
  briefSummary?: string;
  qualityThreshold?: number;
  targetDifficulty: number;
  puzzleType?: string;
  category?: string;
  theme?: string;
};

/**
 * Fail closed when a repair cannot stay answer/cue locked.
 */
export function critiqueRepairIssues(input: {
  answer?: string;
  answerSeedCuePlan?: readonly AnswerSeedVisualCue[];
  reviseInstructions?: readonly string[];
}): string[] {
  const issues: string[] = [];
  if (!input.answer?.trim()) {
    issues.push("Critique repair requires a locked answer");
  }
  if (!input.answerSeedCuePlan?.length) {
    issues.push("Critique repair requires a locked answer-seed cue plan");
  }
  if (!input.reviseInstructions?.length) {
    issues.push("Critique repair requires model reviseInstructions");
  }
  return issues;
}

/**
 * Build ToolLoop params for a single critique-locked repair pass.
 */
export function buildCritiqueRepairParams(
  request: CritiqueRepairRequest,
  base?: Partial<PuzzleGenerationParams>
): PuzzleGenerationParams {
  const issues = critiqueRepairIssues(request);
  if (issues.length) {
    throw new Error(`Critique repair unavailable: ${issues.join("; ")}`);
  }

  return {
    ...base,
    targetDifficulty: request.targetDifficulty,
    puzzleType: request.puzzleType,
    category: request.category,
    theme: request.theme,
    qualityThreshold: request.qualityThreshold,
    briefSummary: request.briefSummary,
    preferredTechniques: [
      request.techniqueId,
      ...(request.preferredTechniques ?? []).filter((id) => id !== request.techniqueId),
    ],
    avoidTechniques: request.avoidTechniques,
    bannedAnswerKeys: request.bannedAnswerKeys,
    answerSeed: request.answer,
    answerSeedCuePlan: request.answerSeedCuePlan,
    revisionInstructions: [...request.reviseInstructions],
    repairMode: "critique-locked",
    maxAttempts: 1,
    modelChainLimit: 1,
    deferRenderedEvaluation: true,
    candidateIndex: undefined,
    candidateCount: undefined,
    // Repair must not brainstorm replacement answers.
    phraseSeeds: [],
  };
}
