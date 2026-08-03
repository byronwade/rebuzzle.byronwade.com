/**
 * Apex Generation Engine
 *
 * Multi-phase pipeline:
 *  1. Curriculum brief (diversity + learning + phrase bank)
 *  2. Multi-candidate Eve generations (tournament slots)
 *  3. Adversarial critique + player simulation
 *  4. Multi-dimensional rubric + winner selection
 */

import { AI_CONFIG } from "../../config";
import { isHardAIBudgetError, parseAIError } from "../../errors";
import { isKnownTechniqueId } from "../quality";
import { type PuzzleGenerationParams, runPuzzleAgentGeneration } from "../run-generation";
import type { PuzzleAgentResult } from "../schemas";
import type { TechniqueId } from "../technique-library";
import { stableId } from "../tool-impl";
import {
  AnswerFirstSeedUnavailableError,
  answerFirstSeedKey,
  selectAnswerFirstSeeds,
} from "./answer-first";
import { toPlayabilityEvidence } from "./blind-solve-consensus";
import { critiqueCandidate } from "./critique";
import { buildCritiqueRepairParams, critiqueRepairIssues } from "./critique-repair";
import { buildGenerationBrief } from "./curriculum";
import { selectQualifiedFinalist } from "./finalist-selection";
import { qualifyRenderedCandidate } from "./rendered-qualification";
import { scoreRubric } from "./rubric";
import type { ApexCandidate, ApexEngineResult, GenerationBrief } from "./types";

function toCandidate(
  result: PuzzleAgentResult,
  brief: GenerationBrief,
  slot: number
): ApexCandidate {
  const p = result.puzzle;
  const techniqueId = (
    isKnownTechniqueId(p.techniqueId) ? p.techniqueId : brief.preferredTechniques[0]
  ) as TechniqueId;
  const evidence = result.metadata.playabilityEvidence;
  const playerSim = evidence
    ? {
        firstWrongParses: [],
        likelySolvePath: p.explanation,
        hintUnlockOrderLooksFair: true,
        unfairReasons: [],
        estimatedSolveRate: result.metadata.estimatedSolveRate ?? 0,
        confidence: Math.min(
          result.metadata.boardRecognitionConfidence ?? 1,
          evidence.editorial.confidence
        ),
        blindProfileCount: evidence.blind.profileCount,
        blindProfilesWithTarget: evidence.blind.profilesWithTarget,
        blindTopTargetFoundBy: evidence.blind.topTargetFoundBy,
        blindDominantTargetFoundBy: evidence.blind.dominantTargetFoundBy,
        blindProfilesWithTopTarget: evidence.blind.profilesWithTopTarget,
        blindProfilesWithDominantTarget: evidence.blind.profilesWithDominantTarget,
        blindMeanReciprocalRank: evidence.blind.meanReciprocalRank,
        blindStrongestWrongConfidence: evidence.blind.strongestWrongConfidence,
        blindRequiredVotes: evidence.blind.requiredVotes,
        blindProfileResults: evidence.blind.profiles,
        editorialProfileCount: evidence.editorial.profileCount,
        editorialAcceptedProfiles: evidence.editorial.acceptedProfiles,
        editorialConfidence: evidence.editorial.confidence,
        editorialFailureKinds: evidence.editorial.failureKinds,
        editorialReasons: [],
      }
    : undefined;

  return {
    id: stableId("apex", String(slot), p.answer, p.rebusPuzzle),
    rebusPuzzle: p.rebusPuzzle,
    answer: p.answer,
    difficulty: p.difficulty,
    difficultyLevel: p.difficultyLevel,
    explanation: p.explanation,
    category: p.category,
    hints: p.hints,
    techniqueId,
    visual: p.visual,
    fingerprint: result.metadata.fingerprint,
    uniquenessScore: result.metadata.uniquenessScore,
    noveltyEvidence: result.metadata.noveltyEvidence,
    calibratedDifficulty: result.metadata.calibratedDifficulty,
    inBand: true,
    isUnique: result.metadata.uniquenessScore >= 50,
    solvable: true,
    qualityOverall: result.metadata.qualityScore,
    funScore: result.metadata.funScore ?? 0,
    answerSeed: result.metadata.answerSeed,
    answerSeedCuePlan: result.metadata.answerSeedCuePlan,
    boardRecognitionConfidence: result.metadata.boardRecognitionConfidence,
    boardRecognitionModels: result.metadata.boardRecognitionModels,
    boardConceptVotes: result.metadata.boardConceptVotes,
    boardTextVotes: result.metadata.boardTextVotes,
    boardOperatorVotes: result.metadata.boardOperatorVotes,
    boardRecognitionProfiles: result.metadata.boardRecognitionProfiles,
    playerSim,
    publishable: result.metadata.qualityVerdict !== "reject",
    rejectReasons: [],
  };
}

async function enrichCandidate(
  candidate: ApexCandidate,
  brief: GenerationBrief
): Promise<ApexCandidate> {
  const apex = AI_CONFIG.puzzleAgent.apex;
  let next = { ...candidate };

  if (apex.critiqueEnabled) {
    const pictogramConcepts = (candidate.visual.layers ?? []).flatMap((layer) =>
      layer.kind === "pictogram" && layer.concept ? [layer.concept] : []
    );
    const critique = await critiqueCandidate({
      rebusPuzzle: candidate.rebusPuzzle,
      answer: candidate.answer,
      explanation: candidate.explanation,
      hints: candidate.hints,
      techniqueId: candidate.techniqueId,
      difficulty: candidate.difficulty,
      tierLabel: brief.tierLabel,
      unicodeFallback: candidate.visual.unicodeFallback,
      pictogramConcepts,
    });
    const creativityScore = critique.creativityScore ?? 60;
    const iconRecognizability = critique.iconRecognizability ?? 70;
    next = {
      ...next,
      critique: {
        ...critique,
        creativityScore,
        iconRecognizability,
        overusedTrope: critique.overusedTrope ?? false,
      },
    };
    if (critique.verdict === "reject") {
      next = {
        ...next,
        publishable: false,
        rejectReasons: [...next.rejectReasons, `Critique reject: ${critique.summary}`],
      };
    } else if (critique.overusedTrope && creativityScore < 55) {
      next = {
        ...next,
        publishable: false,
        rejectReasons: [
          ...next.rejectReasons,
          `Overused trope with low creativity (${creativityScore}) — invent a fresher mechanism`,
        ],
      };
    } else if (iconRecognizability < 70) {
      next = {
        ...next,
        publishable: false,
        rejectReasons: [
          ...next.rejectReasons,
          `Icons look unrecognizable (score ${iconRecognizability}) — redraw concrete silhouettes`,
        ],
      };
    } else if (critique.verdict === "revise" && critique.reviseInstructions.length) {
      next = {
        ...next,
        publishable: false,
        rejectReasons: [
          ...next.rejectReasons,
          `Critique revise: ${critique.reviseInstructions.slice(0, 2).join("; ")}`,
        ],
      };
    }
  }

  const rubric = scoreRubric(next);
  return { ...next, rubric };
}

/**
 * Run the full Apex tournament pipeline and return the winning PuzzleAgentResult.
 */
export async function runApexGeneration(
  params: PuzzleGenerationParams
): Promise<PuzzleAgentResult> {
  const started = Date.now();
  const briefStarted = Date.now();

  const brief = await buildGenerationBrief({
    targetDifficulty: params.targetDifficulty,
    puzzleType: params.puzzleType,
    theme: params.theme,
    category: params.category,
    requireNovelty: params.requireNovelty,
    qualityThreshold: params.qualityThreshold,
    candidateCount: params.candidateCount ?? AI_CONFIG.puzzleAgent.apex.candidateCount,
    useLearningFeedback: params.useLearningFeedback,
  });
  const briefMs = Date.now() - briefStarted;

  const generateStarted = Date.now();
  const candidates: ApexCandidate[] = [];
  const failures: string[] = [];
  const answerSeedEntries = selectAnswerFirstSeeds({
    entries: brief.phraseSuggestions,
    techniqueIds: brief.preferredTechniques,
    count: brief.candidateCount,
    usedAnswerKeys: brief.diversity.bannedAnswerKeys,
    requireVisualCuePlan: true,
  });
  if (answerSeedEntries.length !== brief.candidateCount) {
    throw new AnswerFirstSeedUnavailableError({
      requestedCount: brief.candidateCount,
      selectedCount: answerSeedEntries.length,
    });
  }

  // Sequential slots — safer for gateway quota; each slot has a reserved answer
  // contract and a distinct brief nudge.
  // react-doctor-sequential: intentional — order/rate-limit required
  for (let slot = 1; slot <= brief.candidateCount; slot++) {
    try {
      // Rotate preferred technique focus per slot
      const focusTechnique =
        brief.preferredTechniques[(slot - 1) % Math.max(1, brief.preferredTechniques.length)];
      const answerSeedEntry = answerSeedEntries[slot - 1];
      const answerSeed = answerFirstSeedKey(answerSeedEntry);
      const antiCopySuggestions = brief.phraseSuggestions.filter(
        (entry) => answerFirstSeedKey(entry) !== answerSeed
      );
      const phraseSlice = antiCopySuggestions.flatMap((p, i) =>
        i % brief.candidateCount === (slot - 1) % brief.candidateCount ? [p.answer] : []
      );

      const result = await runPuzzleAgentGeneration({
        ...params,
        // Host-side quality gates remain strict; do not pay for a second full
        // agent + vision tournament unless an operator explicitly requests it.
        maxAttempts: Math.min(params.maxAttempts ?? 1, 2),
        qualityThreshold: brief.qualityThreshold,
        briefSummary: brief.briefSummary,
        preferredTechniques: focusTechnique
          ? [focusTechnique, ...brief.preferredTechniques.filter((t) => t !== focusTechnique)]
          : brief.preferredTechniques,
        avoidTechniques: brief.avoidTechniques,
        phraseSeeds: phraseSlice.length
          ? phraseSlice
          : antiCopySuggestions.slice(0, 3).map((p) => p.answer),
        answerSeed: answerSeedEntry?.answer,
        answerSeedCuePlan: answerSeedEntry?.visualCues,
        bannedAnswerKeys: brief.diversity.bannedAnswerKeys,
        candidateIndex: slot,
        candidateCount: brief.candidateCount,
        useLearningFeedback: params.useLearningFeedback,
        deferRenderedEvaluation: true,
      });

      candidates.push(toCandidate(result, brief, slot));
    } catch (error) {
      if (isHardAIBudgetError(error)) {
        throw parseAIError(error);
      }
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  const generateMs = Date.now() - generateStarted;

  if (!candidates.length) {
    throw new Error(
      `Apex engine produced no candidates. Failures: ${failures.slice(0, 3).join(" | ") || "unknown"}`
    );
  }

  let simCalibration: { adjustment: number; sampleSize: number } | undefined;
  try {
    const { loadSimCalibration } = await import("../../learning/sim-calibration");
    const loaded = await loadSimCalibration();
    simCalibration = {
      adjustment: loaded.adjustment,
      sampleSize: loaded.sampleSize,
    };
  } catch {
    simCalibration = undefined;
  }

  const selectStarted = Date.now();
  let critiqueMs = 0;
  const configuredRuntimeBudgetMs = Number(process.env.REBUZZLE_APEX_RUNTIME_BUDGET_MS);
  const runtimeBudgetMs = Math.max(
    120_000,
    Math.min(
      280_000,
      Number.isFinite(configuredRuntimeBudgetMs) && configuredRuntimeBudgetMs > 0
        ? configuredRuntimeBudgetMs
        : 260_000
    )
  );
  let lastEvaluationMs = 0;
  const configuredRevisionReserveMs = Number(process.env.REBUZZLE_APEX_REVISION_RESERVE_MS);
  const revisionReserveMs = Math.max(
    120_000,
    Math.min(
      210_000,
      Number.isFinite(configuredRevisionReserveMs) && configuredRevisionReserveMs > 0
        ? configuredRevisionReserveMs
        : 155_000
    )
  );
  const selection = await selectQualifiedFinalist({
    candidates,
    minRubricOverall: brief.minRubricOverall,
    prepare: async (candidate) => {
      const critiqueStarted = Date.now();
      try {
        return await enrichCandidate(candidate, brief);
      } finally {
        critiqueMs += Date.now() - critiqueStarted;
      }
    },
    canStartEvaluation: () => {
      const remaining = runtimeBudgetMs - (Date.now() - started);
      const required = lastEvaluationMs > 0 ? lastEvaluationMs + 10_000 : 65_000;
      return remaining >= required;
    },
    canStartRevision: () => runtimeBudgetMs - (Date.now() - started) >= revisionReserveMs,
    maxRevisions: 1,
    revise: async (candidate) => {
      try {
        const repairIssues = critiqueRepairIssues({
          answer: candidate.answer,
          answerSeedCuePlan: candidate.answerSeedCuePlan,
          reviseInstructions: candidate.critique?.reviseInstructions,
        });
        if (repairIssues.length) {
          failures.push(`Critique repair skipped: ${repairIssues.join("; ")}`);
          return null;
        }
        const result = await runPuzzleAgentGeneration(
          buildCritiqueRepairParams(
            {
              answer: candidate.answer,
              answerSeedCuePlan: candidate.answerSeedCuePlan,
              techniqueId: candidate.techniqueId,
              reviseInstructions: candidate.critique?.reviseInstructions ?? [],
              preferredTechniques: brief.preferredTechniques,
              avoidTechniques: brief.avoidTechniques,
              bannedAnswerKeys: Array.from(new Set(brief.diversity.bannedAnswerKeys)),
              briefSummary: brief.briefSummary,
              qualityThreshold: brief.qualityThreshold,
              targetDifficulty: params.targetDifficulty,
              puzzleType: params.puzzleType,
              category: params.category,
              theme: params.theme,
            },
            params
          )
        );
        return toCandidate(result, brief, brief.candidateCount + 1);
      } catch (error) {
        if (isHardAIBudgetError(error)) throw parseAIError(error);
        return null;
      }
    },
    evaluate: async (candidate) => {
      const evaluationStarted = Date.now();
      try {
        return await qualifyRenderedCandidate(candidate, simCalibration);
      } finally {
        lastEvaluationMs = Date.now() - evaluationStarted;
      }
    },
  });
  const { winner, ranked } = selection;
  failures.push(...selection.failures);
  const selectMs = Math.max(0, Date.now() - selectStarted - critiqueMs);

  if (!winner) {
    throw new Error(
      `Apex tournament found no candidate meeting the publish rubric. Failures: ${failures.join(" | ") || "gates/rubric"}`
    );
  }

  return await finalizeWinner(
    winner,
    ranked,
    brief,
    {
      briefMs,
      generateMs,
      critiqueMs,
      selectMs,
      totalMs: Date.now() - started,
    },
    failures,
    simCalibration,
    selection.revisionAttempts
  );
}

async function finalizeWinner(
  winner: ApexCandidate,
  ranked: ApexCandidate[],
  brief: GenerationBrief,
  phases: ApexEngineResult["phases"],
  failures: string[],
  simCalibration?: { adjustment: number; sampleSize: number },
  revisionAttempts = 0
): Promise<PuzzleAgentResult> {
  // Final archive uniqueness gate — never ship a recycled answer
  const { isAnswerRegistered } = await import("../../learning/answer-registry");
  let chosen = winner;
  const archiveHit = await isAnswerRegistered(chosen.answer);
  if (archiveHit.taken) {
    const alternate = ranked.find(
      (candidate) =>
        candidate.id !== chosen.id &&
        candidate.publishable &&
        candidate.playerSim !== undefined &&
        (candidate.boardRecognitionProfiles?.length ?? 0) > 0 &&
        (candidate.tournamentScore ?? -1) >= 0
    );
    if (!alternate) {
      throw new Error(
        `Apex winner answer already archived (${archiveHit.puzzleId}). No alternate candidate.`
      );
    }
    const altHit = await isAnswerRegistered(alternate.answer);
    if (altHit.taken) {
      throw new Error("Apex candidates collided with archive answers — regenerate required");
    }
    chosen = alternate;
  }

  const runnersUp = ranked.filter((c) => c.id !== chosen.id).slice(0, 3);
  const thinkingSummary = [
    `Apex tournament winner (${brief.tierLabel})`,
    `rubric ${chosen.rubric?.overall ?? "?"}/100`,
    `technique ${chosen.techniqueId}`,
    `candidates ${ranked.length}`,
    revisionAttempts ? `critique revisions ${revisionAttempts}` : null,
    failures.length ? `slot failures ${failures.length}` : null,
    learningNote(brief),
    `${phases.totalMs}ms`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    puzzle: {
      rebusPuzzle: chosen.rebusPuzzle,
      answer: chosen.answer,
      difficulty: chosen.difficulty,
      difficultyLevel: chosen.difficultyLevel,
      explanation: chosen.explanation,
      category: chosen.category,
      hints: chosen.hints,
      techniqueId: chosen.techniqueId,
      visual: chosen.visual,
    },
    metadata: {
      fingerprint: chosen.fingerprint,
      uniquenessScore: chosen.uniquenessScore,
      noveltyEvidence: chosen.noveltyEvidence,
      calibratedDifficulty: chosen.calibratedDifficulty,
      difficultyLevel: chosen.difficultyLevel,
      qualityScore: Math.max(chosen.qualityOverall, chosen.rubric?.overall ?? 0),
      qualityVerdict:
        (chosen.rubric?.overall ?? 0) >= 88
          ? "excellent"
          : (chosen.rubric?.overall ?? 0) >= 78
            ? "good"
            : "acceptable",
      funScore: chosen.funScore,
      generationAttempts: ranked.length,
      thinkingSummary,
      visualStyleId: chosen.visual.styleId,
      answerSeed: chosen.answerSeed,
      answerSeedCuePlan: chosen.answerSeedCuePlan ? [...chosen.answerSeedCuePlan] : undefined,
      estimatedSolveRate: chosen.playerSim?.estimatedSolveRate,
      playabilityEvidence: chosen.playerSim ? toPlayabilityEvidence(chosen.playerSim) : undefined,
      boardRecognitionConfidence: chosen.boardRecognitionConfidence,
      boardRecognitionModels: chosen.boardRecognitionModels,
      boardConceptVotes: chosen.boardConceptVotes,
      boardTextVotes: chosen.boardTextVotes,
      boardOperatorVotes: chosen.boardOperatorVotes,
      boardRecognitionProfiles: chosen.boardRecognitionProfiles,
      simCalibrationBias:
        simCalibration && simCalibration.sampleSize >= 6 ? simCalibration.adjustment : undefined,
    },
    status: "success",
    recommendations: [
      ...(chosen.critique?.reviseInstructions ?? []).slice(0, 2),
      ...runnersUp.map(
        (r) => `Runner-up: ${r.answer} (${r.techniqueId}, rubric ${r.rubric?.overall ?? "?"})`
      ),
      brief.learning.enabled && brief.learning.preferPatterns[0]
        ? `Learning: ${brief.learning.preferPatterns[0]}`
        : "",
    ].filter(Boolean),
  };
}

function learningNote(brief: GenerationBrief): string | null {
  if (!brief.learning.enabled) return null;
  if (brief.learning.tooEasy) return "self-learn:raise-difficulty";
  if (brief.learning.tooHard) return "self-learn:ease-difficulty";
  return "self-learn:stable";
}

export type { ApexEngineResult, GenerationBrief };
