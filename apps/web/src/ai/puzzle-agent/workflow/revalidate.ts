/**
 * Re-run hard publish gates after polish / mutation.
 */

import { AI_CONFIG } from "../../config";
import { scoreHintFairness } from "../craft/hint-fairness";
import { isIdiomFairForDaily } from "../craft/idiom-frequency";
import { scoreShareability } from "../craft/shareability";
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
 * Async so brand catalog + anti-clone embedding checks can run.
 */
export async function revalidateCandidateAfterPolish(
  candidate: ApexCandidate,
  targetDifficulty: number,
  options?: {
    multiSolveOk?: boolean;
    multiSolveReasons?: string[];
    critiqueProvisional?: boolean;
    requireHardRubric?: boolean;
    minRubricOverall?: number;
    /** Skip DB/network craft gates (unit tests) */
    skipAsyncCraftGates?: boolean;
  }
): Promise<RevalidateResult> {
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

  // Hint ladder fairness (sync)
  const hintFair = scoreHintFairness({
    hints: candidate.hints,
    answer: candidate.answer,
    tierLabel: candidate.difficultyLevel,
  });
  if (!hintFair.ok) {
    publishable = false;
    rejectReasons.push(
      ...hintFair.problems.map((p) => `Hint fairness: ${p}`),
      ...(hintFair.tips.slice(0, 1).map((t) => `Hint tip: ${t}`))
    );
  }

  // Shareability of unicodeFallback
  const pictogramCount = (candidate.visual.layers ?? []).filter(
    (l) => l.kind === "pictogram"
  ).length;
  const hasStyledText = (candidate.visual.layers ?? []).some(
    (l) => l.kind === "text" && Boolean(l.emphasis && l.emphasis !== "normal")
  );
  const share = scoreShareability({
    unicodeFallback: candidate.visual.unicodeFallback || candidate.rebusPuzzle,
    answer: candidate.answer,
    pictogramCount,
    hasStyledText,
  });
  if (!share.ok) {
    publishable = false;
    rejectReasons.push(...share.problems.map((p) => `Shareability: ${p}`));
  }

  // Idiom frequency gate for idiom techniques
  if (
    candidate.techniqueId.includes("idiom") ||
    candidate.techniqueId === "rare_but_fair_idiom"
  ) {
    const idiom = isIdiomFairForDaily(
      candidate.answer,
      targetDifficulty >= 8 ? 3 : 4
    );
    // Unknown idioms are soft-warn only (corpus is not exhaustive); sensitive/low-freq hard-fail
    if (!idiom.ok && idiom.frequency !== null) {
      publishable = false;
      rejectReasons.push(`Idiom fairness: ${idiom.reason}`);
    }
  }

  if (!options?.skipAsyncCraftGates) {
    // Dynamic imports keep unit tests free of ESM `ai` embedding deps
    const { validateBrandLogoWordplay } = await import("../craft/brand-constraints");
    const { checkAntiClone } = await import("../craft/anti-clone");

    const brand = await validateBrandLogoWordplay({
      techniqueId: candidate.techniqueId,
      answer: candidate.answer,
      visual: candidate.visual,
    });
    if (!brand.ok) {
      publishable = false;
      rejectReasons.push(...brand.problems.map((p) => `Brand: ${p}`));
    }

    const antiClone = await checkAntiClone({
      rebusPuzzle: candidate.rebusPuzzle,
      answer: candidate.answer,
      explanation: candidate.explanation,
      category: candidate.category,
      techniqueId: candidate.techniqueId,
      visual: candidate.visual,
    });
    if (!antiClone.ok) {
      publishable = false;
      rejectReasons.push(...antiClone.problems.map((p) => `Anti-clone: ${p}`));
    }
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
