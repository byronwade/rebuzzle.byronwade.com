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
import { isKnownTechniqueId } from "../quality";
import {
  type PuzzleGenerationParams,
  runPuzzleAgentGeneration,
} from "../run-generation";
import type { PuzzleAgentResult } from "../schemas";
import { stableId } from "../tool-impl";
import type { TechniqueId } from "../technique-library";
import { buildGenerationBrief } from "./curriculum";
import { critiqueCandidate } from "./critique";
import { applyPlayerSimHeuristics, simulatePlayerSolve } from "./player-sim";
import { scoreRubric } from "./rubric";
import { pickWinner } from "./tournament";
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
    calibratedDifficulty: result.metadata.calibratedDifficulty,
    inBand: true,
    isUnique: result.metadata.uniquenessScore >= 50,
    solvable: true,
    qualityOverall: result.metadata.qualityScore,
    funScore: result.metadata.funScore ?? 0,
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
    const critique = await critiqueCandidate({
      rebusPuzzle: candidate.rebusPuzzle,
      answer: candidate.answer,
      explanation: candidate.explanation,
      hints: candidate.hints,
      techniqueId: candidate.techniqueId,
      difficulty: candidate.difficulty,
      tierLabel: brief.tierLabel,
      unicodeFallback: candidate.visual.unicodeFallback,
    });
    next = { ...next, critique };
    if (critique.verdict === "reject") {
      next = {
        ...next,
        publishable: false,
        rejectReasons: [...next.rejectReasons, `Critique reject: ${critique.summary}`],
      };
    }
  }

  if (apex.playerSimEnabled) {
    const rawSim = await simulatePlayerSolve({
      rebusPuzzle: candidate.rebusPuzzle,
      answer: candidate.answer,
      explanation: candidate.explanation,
      hints: candidate.hints,
      techniqueId: candidate.techniqueId,
      tierLabel: brief.tierLabel,
    });
    const playerSim = applyPlayerSimHeuristics(rawSim, {
      answer: candidate.answer,
      hints: candidate.hints,
      tierLabel: brief.tierLabel,
    });
    next = { ...next, playerSim };
    if (!playerSim.hintUnlockOrderLooksFair || playerSim.unfairReasons.length > 2) {
      next = {
        ...next,
        rejectReasons: [
          ...next.rejectReasons,
          ...(playerSim.unfairReasons.length
            ? playerSim.unfairReasons
            : ["Player sim flagged unfair hint ladder"]),
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

  // Sequential slots — safer for gateway quota; each slot gets a distinct brief nudge
  for (let slot = 1; slot <= brief.candidateCount; slot++) {
    try {
      // Rotate preferred technique focus per slot
      const focusTechnique =
        brief.preferredTechniques[(slot - 1) % Math.max(1, brief.preferredTechniques.length)];
      const phraseSlice = brief.phraseSuggestions
        .filter((_, i) => i % brief.candidateCount === (slot - 1) % brief.candidateCount)
        .map((p) => p.answer);

      const result = await runPuzzleAgentGeneration({
        ...params,
        maxAttempts: Math.min(params.maxAttempts ?? 2, 2),
        qualityThreshold: brief.qualityThreshold,
        briefSummary: brief.briefSummary,
        preferredTechniques: focusTechnique
          ? [focusTechnique, ...brief.preferredTechniques.filter((t) => t !== focusTechnique)]
          : brief.preferredTechniques,
        avoidTechniques: brief.avoidTechniques,
        phraseSeeds: phraseSlice.length
          ? phraseSlice
          : brief.phraseSuggestions.slice(0, 3).map((p) => p.answer),
        bannedAnswerKeys: brief.diversity.bannedAnswerKeys,
        candidateIndex: slot,
        candidateCount: brief.candidateCount,
        useLearningFeedback: params.useLearningFeedback,
      });

      candidates.push(toCandidate(result, brief, slot));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
  }
  const generateMs = Date.now() - generateStarted;

  if (!candidates.length) {
    throw new Error(
      `Apex engine produced no candidates. Failures: ${failures.slice(0, 3).join(" | ") || "unknown"}`
    );
  }

  const critiqueStarted = Date.now();
  const enriched = await Promise.all(candidates.map((c) => enrichCandidate(c, brief)));
  const critiqueMs = Date.now() - critiqueStarted;

  const selectStarted = Date.now();
  const { winner, ranked } = pickWinner(enriched, brief.minRubricOverall);
  const selectMs = Date.now() - selectStarted;

  if (!winner) {
    // Soft fallback: best rubric even if under threshold, if still publishable
    const fallback = ranked.find((c) => c.publishable && c.isUnique && c.solvable);
    if (!fallback) {
      throw new Error(
        `Apex tournament found no publishable winner. Failures: ${failures.join(" | ") || "gates/rubric"}`
      );
    }
    return finalizeWinner(fallback, ranked, brief, {
      briefMs,
      generateMs,
      critiqueMs,
      selectMs,
      totalMs: Date.now() - started,
    }, failures);
  }

  return finalizeWinner(winner, ranked, brief, {
    briefMs,
    generateMs,
    critiqueMs,
    selectMs,
    totalMs: Date.now() - started,
  }, failures);
}

function finalizeWinner(
  winner: ApexCandidate,
  ranked: ApexCandidate[],
  brief: GenerationBrief,
  phases: ApexEngineResult["phases"],
  failures: string[]
): PuzzleAgentResult {
  const runnersUp = ranked.filter((c) => c.id !== winner.id).slice(0, 3);
  const thinkingSummary = [
    `Apex tournament winner (${brief.tierLabel})`,
    `rubric ${winner.rubric?.overall ?? "?"}/100`,
    `technique ${winner.techniqueId}`,
    `candidates ${ranked.length}`,
    failures.length ? `slot failures ${failures.length}` : null,
    `${phases.totalMs}ms`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    puzzle: {
      rebusPuzzle: winner.rebusPuzzle,
      answer: winner.answer,
      difficulty: winner.difficulty,
      difficultyLevel: winner.difficultyLevel,
      explanation: winner.explanation,
      category: winner.category,
      hints: winner.hints,
      techniqueId: winner.techniqueId,
      visual: winner.visual,
    },
    metadata: {
      fingerprint: winner.fingerprint,
      uniquenessScore: winner.uniquenessScore,
      calibratedDifficulty: winner.calibratedDifficulty,
      difficultyLevel: winner.difficultyLevel,
      qualityScore: Math.max(winner.qualityOverall, winner.rubric?.overall ?? 0),
      qualityVerdict:
        (winner.rubric?.overall ?? 0) >= 88
          ? "excellent"
          : (winner.rubric?.overall ?? 0) >= 78
            ? "good"
            : "acceptable",
      funScore: winner.funScore,
      generationAttempts: ranked.length,
      thinkingSummary,
      visualStyleId: winner.visual.styleId,
    },
    status: "success",
    recommendations: [
      ...(winner.critique?.reviseInstructions ?? []).slice(0, 2),
      ...runnersUp.map(
        (r) =>
          `Runner-up: ${r.answer} (${r.techniqueId}, rubric ${r.rubric?.overall ?? "?"})`
      ),
      brief.learning.enabled && brief.learning.preferPatterns[0]
        ? `Learning: ${brief.learning.preferPatterns[0]}`
        : "",
    ].filter(Boolean),
  };
}

export type { ApexEngineResult, GenerationBrief };
