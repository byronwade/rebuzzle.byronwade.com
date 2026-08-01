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
import { candidateNeedsVisualPolish } from "./polish-gates";
import { polishCandidateVisuals } from "./polish-visuals";
import { scoreRubric } from "./rubric";
import { pickDiverseTechniqueFocuses } from "../workflow/technique-gates";
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
  brief: GenerationBrief,
  simCalibration?: { adjustment: number; sampleSize: number }
): Promise<ApexCandidate> {
  const apex = AI_CONFIG.puzzleAgent.apex;
  let next = { ...candidate };

  if (apex.critiqueEnabled) {
    const pictogramLayers = (candidate.visual.layers ?? []).filter(
      (layer) => layer.kind === "pictogram"
    );
    const pictogramConcepts = pictogramLayers.flatMap((layer) =>
      layer.concept ? [layer.concept] : []
    );
    const pictogramSvgs = pictogramLayers.flatMap((layer) =>
      layer.svg ? [layer.svg] : []
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
      pictogramSvgs,
      iconRecognitionNotes: pictogramLayers.map((layer) => {
        if (!layer.svg) return `${layer.concept}: MISSING svg / emoji fallback`;
        if (layer.recognitionOk === false) {
          return `${layer.concept}: FAILED recognition (seen as ${layer.seenAs ?? "unclear"})`;
        }
        if (layer.recognitionOk === true) {
          return `${layer.concept}: recognized${layer.seenAs ? ` as ${layer.seenAs}` : ""}`;
        }
        return `${layer.concept}: svg present (recognition untested)`;
      }),
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
    } else if (iconRecognizability < 55) {
      next = {
        ...next,
        publishable: iconRecognizability >= 45 ? next.publishable : false,
        rejectReasons: [
          ...next.rejectReasons,
          `Icons look unrecognizable (score ${iconRecognizability}) — redraw concrete silhouettes`,
        ],
      };
    } else if (critique.verdict === "revise" && critique.reviseInstructions.length) {
      next = {
        ...next,
        rejectReasons: [
          ...next.rejectReasons,
          `Critique revise: ${critique.reviseInstructions.slice(0, 2).join("; ")}`,
        ],
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
      layout: candidate.visual.layout,
      pictogramConcepts: (candidate.visual.layers ?? []).flatMap((layer) =>
        layer.kind === "pictogram" && layer.concept ? [layer.concept] : []
      ),
      textLayers: (candidate.visual.layers ?? []).flatMap((layer) =>
        layer.kind === "text" && layer.content
          ? [`${layer.content}${layer.emphasis ? ` (${layer.emphasis})` : ""}`]
          : []
      ),
    });
    let playerSim = applyPlayerSimHeuristics(rawSim, {
      answer: candidate.answer,
      hints: candidate.hints,
      tierLabel: brief.tierLabel,
    });
    if (
      simCalibration &&
      simCalibration.sampleSize >= 6 &&
      Math.abs(simCalibration.adjustment) >= 0.02
    ) {
      const { applySimCalibration } = await import("../../learning/sim-calibration");
      playerSim = {
        ...playerSim,
        estimatedSolveRate: applySimCalibration(
          playerSim.estimatedSolveRate,
          simCalibration
        ),
      };
    }
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

  const diverseFocuses = pickDiverseTechniqueFocuses(
    brief.preferredTechniques,
    brief.candidateCount,
    brief.targetDifficulty
  );

  // Sequential slots — safer for gateway quota; each slot gets a distinct family focus
  for (let slot = 1; slot <= brief.candidateCount; slot++) {
    try {
      const focusTechnique = diverseFocuses[slot - 1];
      const phraseSlice = brief.phraseSuggestions
        .filter((_, i) => i % brief.candidateCount === (slot - 1) % brief.candidateCount)
        .map((p) => p.answer);

      const result = await runPuzzleAgentGeneration({
        ...params,
        // Use curriculum-adjusted difficulty (learning delta applied)
        targetDifficulty: brief.targetDifficulty,
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
  const enriched = await Promise.all(
    candidates.map((c) => enrichCandidate(c, brief, simCalibration))
  );

  // One polish pass: regenerate weak/missing pictograms using critique notes
  const polished = await Promise.all(
    enriched.map(async (candidate) => {
      if (!candidateNeedsVisualPolish(candidate)) return candidate;
      const notes = candidate.critique?.reviseInstructions ?? [];
      const next = await polishCandidateVisuals(candidate, notes);
      const rubric = scoreRubric(next);
      return { ...next, rubric };
    })
  );
  const critiqueMs = Date.now() - critiqueStarted;

  const selectStarted = Date.now();
  const { winner, ranked } = pickWinner(polished, brief.minRubricOverall);
  const selectMs = Date.now() - selectStarted;

  if (!winner) {
    throw new Error(
      `Apex tournament found no publishable winner (hard rubric floor ${brief.minRubricOverall}). Failures: ${failures.join(" | ") || "gates/rubric"}`
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
    simCalibration
  );
}

async function finalizeWinner(
  winner: ApexCandidate,
  ranked: ApexCandidate[],
  brief: GenerationBrief,
  phases: ApexEngineResult["phases"],
  failures: string[],
  simCalibration?: { adjustment: number; sampleSize: number }
): Promise<PuzzleAgentResult> {
  // Final archive uniqueness gate — never ship a recycled answer
  const { isAnswerRegistered } = await import("../../learning/answer-registry");
  let chosen = winner;
  const archiveHit = await isAnswerRegistered(chosen.answer);
  if (archiveHit.taken) {
    const alternate = ranked.find(
      (c) => c.id !== chosen.id && (c.tournamentScore ?? -1) >= 0
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
      estimatedSolveRate: chosen.playerSim?.estimatedSolveRate,
      simCalibrationBias:
        simCalibration && simCalibration.sampleSize >= 6
          ? simCalibration.adjustment
          : undefined,
    },
    status: "success",
    recommendations: [
      ...(chosen.critique?.reviseInstructions ?? []).slice(0, 2),
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

function learningNote(brief: GenerationBrief): string | null {
  if (!brief.learning.enabled) return null;
  if (brief.learning.tooEasy) return "self-learn:raise-difficulty";
  if (brief.learning.tooHard) return "self-learn:ease-difficulty";
  return "self-learn:stable";
}

export type { ApexEngineResult, GenerationBrief };
