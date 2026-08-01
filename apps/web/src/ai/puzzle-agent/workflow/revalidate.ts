/**
 * Re-run hard publish gates after polish / mutation.
 */

import { AI_CONFIG } from "../../config";
import { isDifficultyInBand } from "../difficulty-levels";
import {
  evaluatePublishGates,
  type PublishGateResult,
} from "../quality";
import type { ApexCandidate } from "../apex/types";
import { isTechniqueAllowedForTier } from "./technique-gates";

export type RevalidateResult = {
  candidate: ApexCandidate;
  gates: PublishGateResult;
  ok: boolean;
};

/**
 * Honest revalidation — updates inBand / solvable / publishable from gates.
 */
export function revalidateCandidateAfterPolish(
  candidate: ApexCandidate,
  targetDifficulty: number,
  options?: {
    multiSolveOk?: boolean;
    multiSolveReasons?: string[];
    critiqueProvisional?: boolean;
    requireHardRubric?: boolean;
    minRubricOverall?: number;
  }
): RevalidateResult {
  const rejectReasons = [...candidate.rejectReasons];
  let publishable = candidate.publishable;
  let solvable = candidate.solvable;
  let inBand = isDifficultyInBand(
    candidate.calibratedDifficulty || candidate.difficulty,
    targetDifficulty
  );

  if (!isTechniqueAllowedForTier(candidate.techniqueId, targetDifficulty)) {
    publishable = false;
    rejectReasons.push(
      `Technique ${candidate.techniqueId} not allowed at difficulty ${targetDifficulty}`
    );
  }

  if (options?.critiqueProvisional) {
    publishable = false;
    rejectReasons.push("Critique soft-failed — reject provisional candidates");
  }

  if (options?.multiSolveOk === false) {
    solvable = false;
    publishable = false;
    rejectReasons.push(
      ...(options.multiSolveReasons?.length
        ? options.multiSolveReasons
        : ["Multi-agent solve failed"])
    );
  }

  const minRubric =
    options?.minRubricOverall ?? AI_CONFIG.puzzleAgent.apex.minRubricOverall;
  if (
    options?.requireHardRubric !== false &&
    (candidate.rubric?.overall ?? 0) < minRubric
  ) {
    publishable = false;
    rejectReasons.push(
      `Rubric ${candidate.rubric?.overall ?? 0} below hard floor ${minRubric}`
    );
  }

  const gates = evaluatePublishGates({
    rebusPuzzle: candidate.rebusPuzzle,
    answer: candidate.answer,
    explanation: candidate.explanation,
    hints: candidate.hints,
    techniqueId: candidate.techniqueId,
    difficulty: candidate.difficulty,
    targetDifficulty,
    qualityOverall: Math.max(
      candidate.qualityOverall,
      candidate.rubric?.overall ?? 0
    ),
    funScore: candidate.funScore,
    qualityThreshold: AI_CONFIG.puzzleAgent.qualityThreshold,
    minFunScore: AI_CONFIG.puzzleAgent.minFunScore,
    publishable,
    qualityIssues: rejectReasons,
    visual: candidate.visual,
    isUnique: candidate.isUnique,
    uniquenessScore: candidate.uniquenessScore,
    solvable,
    calibratedDifficulty: candidate.calibratedDifficulty,
    inBand,
  });

  if (!gates.ok) {
    publishable = false;
    rejectReasons.push(gates.reason);
  }

  const next: ApexCandidate = {
    ...candidate,
    inBand,
    solvable,
    publishable,
    rejectReasons,
  };

  return {
    candidate: next,
    gates,
    ok: gates.ok && publishable && solvable && inBand && next.isUnique,
  };
}
