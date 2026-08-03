/**
 * Master Puzzle Generation
 *
 * Thin entry point over Apex (tournament) or classic Eve ToolLoopAgent.
 * Keeps the public API used by daily generation, admin routes, and scripts.
 */

import { AI_CONFIG } from "../config";
import { runApexGeneration } from "../puzzle-agent/apex/engine";
import { toPlayabilityEvidence } from "../puzzle-agent/apex/blind-solve-consensus";
import {
  applyPlayerSimHeuristics,
  playerSimPublishBlockers,
  simulatePlayerSolve,
} from "../puzzle-agent/apex/player-sim";
import type { AnswerSeedVisualCue } from "../puzzle-agent/apex/types";
import {
  type PuzzleGenerationParams,
  runPuzzleAgentGeneration,
} from "../puzzle-agent/run-generation";
import type { PuzzleAgentResult } from "../puzzle-agent/schemas";
import type { PuzzleVisual } from "../puzzle-agent/visual/composition";

export type MasterGenerationParams = PuzzleGenerationParams;

export interface GeneratedPuzzleResult {
  puzzle: {
    rebusPuzzle: string;
    answer: string;
    difficulty: number;
    difficultyLevel: "Hard" | "Difficult" | "Evil" | "Impossible";
    explanation: string;
    category: string;
    hints: string[];
    techniqueId: string;
    /** Generative board (Ink Pictograms / text / optional images) */
    visual: PuzzleVisual;
  };
  metadata: {
    fingerprint: string;
    uniquenessScore: number;
    noveltyEvidence?: PuzzleAgentResult["metadata"]["noveltyEvidence"];
    difficultyProfile: {
      overall: number;
      method: string;
      tier: string;
    };
    calibratedDifficulty: number;
    qualityMetrics: {
      scores: { overall: number; fun?: number };
      analysis: {
        strengths: string[];
        weaknesses: string[];
        improvements: string[];
        verdict: string;
      };
      detailedFeedback: string;
    };
    generationAttempts: number;
    generationTimeMs: number;
    aiThinking: { summary?: string };
    engine?: "apex" | "eve";
    answerSeed?: string;
    answerSeedCuePlan?: readonly AnswerSeedVisualCue[];
    estimatedSolveRate?: number;
    playabilityEvidence?: PuzzleAgentResult["metadata"]["playabilityEvidence"];
    simCalibrationBias?: number;
    boardRecognitionConfidence?: number;
    boardRecognitionModels?: string[];
    boardConceptVotes?: Record<string, number>;
    boardTextVotes?: Record<string, number>;
    boardOperatorVotes?: Record<string, number>;
    boardRecognitionProfiles?: Array<{
      profileId: string;
      viewportWidth: number;
      tileSize: number;
      confidence: number;
      models: string[];
      conceptVotes: Record<string, number>;
      textVotes: Record<string, number>;
      operatorVotes: Record<string, number>;
      wrappedRows: number;
    }>;
  };
  status: "success" | "retry" | "failed";
  recommendations: string[];
}

function toGeneratedResult(
  result: PuzzleAgentResult,
  generationTimeMs: number,
  engine: "apex" | "eve"
): GeneratedPuzzleResult {
  return {
    puzzle: {
      rebusPuzzle: result.puzzle.rebusPuzzle,
      answer: result.puzzle.answer,
      difficulty: result.puzzle.difficulty,
      difficultyLevel: result.puzzle.difficultyLevel,
      explanation: result.puzzle.explanation,
      category: result.puzzle.category,
      hints: result.puzzle.hints,
      techniqueId: result.puzzle.techniqueId,
      visual: result.puzzle.visual,
    },
    metadata: {
      fingerprint: result.metadata.fingerprint,
      uniquenessScore: result.metadata.uniquenessScore,
      noveltyEvidence: result.metadata.noveltyEvidence,
      difficultyProfile: {
        overall: result.metadata.calibratedDifficulty,
        method: engine === "apex" ? "apex-tournament" : "eve-tool-agent",
        tier: result.metadata.difficultyLevel,
      },
      calibratedDifficulty: result.metadata.calibratedDifficulty,
      qualityMetrics: {
        scores: {
          overall: result.metadata.qualityScore,
          fun: result.metadata.funScore,
        },
        analysis: {
          strengths: [],
          weaknesses: [],
          improvements: result.recommendations ?? [],
          verdict: result.metadata.qualityVerdict,
        },
        detailedFeedback: result.metadata.thinkingSummary ?? "",
      },
      generationAttempts: result.metadata.generationAttempts ?? 1,
      generationTimeMs,
      aiThinking: { summary: result.metadata.thinkingSummary },
      engine,
      answerSeed: result.metadata.answerSeed,
      answerSeedCuePlan: result.metadata.answerSeedCuePlan,
      estimatedSolveRate: result.metadata.estimatedSolveRate,
      playabilityEvidence: result.metadata.playabilityEvidence,
      simCalibrationBias: result.metadata.simCalibrationBias,
      boardRecognitionConfidence: result.metadata.boardRecognitionConfidence,
      boardRecognitionModels: result.metadata.boardRecognitionModels,
      boardConceptVotes: result.metadata.boardConceptVotes,
      boardTextVotes: result.metadata.boardTextVotes,
      boardOperatorVotes: result.metadata.boardOperatorVotes,
      boardRecognitionProfiles: result.metadata.boardRecognitionProfiles,
    },
    status: result.status,
    recommendations: result.recommendations ?? [],
  };
}

function apexEnabled(params: MasterGenerationParams): boolean {
  if (params.candidateCount === 1) return false;
  return AI_CONFIG.puzzleAgent.apex.enabled !== false;
}

async function enforceClassicPlayability(result: PuzzleAgentResult): Promise<PuzzleAgentResult> {
  if (result.metadata.playabilityEvidence) return result;
  const rawSim = await simulatePlayerSolve({
    rebusPuzzle: result.puzzle.rebusPuzzle,
    answer: result.puzzle.answer,
    explanation: result.puzzle.explanation,
    hints: result.puzzle.hints,
    techniqueId: result.puzzle.techniqueId,
    tierLabel: result.puzzle.difficultyLevel,
    visual: result.puzzle.visual,
  });
  const sim = applyPlayerSimHeuristics(rawSim, {
    answer: result.puzzle.answer,
    hints: result.puzzle.hints,
    tierLabel: result.puzzle.difficultyLevel,
  });
  const blockers = playerSimPublishBlockers(sim);
  if (blockers.length) {
    throw new Error(
      `Classic generator puzzle failed screenshot playability gates: ${Array.from(new Set(blockers)).join(" | ")}`
    );
  }
  return {
    ...result,
    metadata: {
      ...result.metadata,
      estimatedSolveRate: sim.estimatedSolveRate,
      playabilityEvidence: toPlayabilityEvidence(sim),
    },
  };
}

/**
 * Generate a high-quality unique puzzle via Apex tournament (default)
 * or classic Eve tool agent.
 */
export async function generateMasterPuzzle(
  params: MasterGenerationParams
): Promise<GeneratedPuzzleResult> {
  const start = Date.now();
  const useApex = apexEnabled(params);

  console.log("[Master Generator] starting", {
    engine: useApex ? "apex" : "eve",
    difficulty: params.targetDifficulty,
    puzzleType: params.puzzleType ?? "rebus",
    candidates: useApex ? AI_CONFIG.puzzleAgent.apex.candidateCount : 1,
  });

  if (useApex) {
    const result = await runApexGeneration({
      ...params,
      useLearningFeedback: params.useLearningFeedback !== false,
    });
    return toGeneratedResult(result, Date.now() - start, "apex");
  }

  const result = await enforceClassicPlayability(await runPuzzleAgentGeneration(params));
  return toGeneratedResult(result, Date.now() - start, "eve");
}

/**
 * Generate a batch of master puzzles for upcoming days.
 */
export async function generateMasterBatch(params: {
  count: number;
  startDifficulty: number;
  difficultyProgression?: "linear" | "sine_wave" | "random";
  ensureVariety?: boolean;
}): Promise<GeneratedPuzzleResult[]> {
  const results: GeneratedPuzzleResult[] = [];

  for (let i = 0; i < params.count; i++) {
    let difficulty = params.startDifficulty;

    if (params.difficultyProgression === "sine_wave") {
      difficulty = Math.round(
        params.startDifficulty + 2 * Math.sin((i / params.count) * Math.PI * 2)
      );
    } else if (params.difficultyProgression === "linear") {
      difficulty = Math.min(10, params.startDifficulty + Math.floor(i / 2));
    } else if (params.difficultyProgression === "random") {
      difficulty = Math.floor(Math.random() * 3) + params.startDifficulty - 1;
    }

    difficulty = Math.max(1, Math.min(10, difficulty));

    const result = await generateMasterPuzzle({
      targetDifficulty: difficulty,
      requireNovelty: params.ensureVariety,
      maxAttempts: 2,
    });
    results.push(result);
  }

  return results;
}

/**
 * Smart puzzle selector — picks a puzzle for a given skill context.
 */
export async function selectOptimalPuzzle(params: {
  playerSkillLevel?: number;
  recentDifficulties?: number[];
  avoidCategories?: string[];
  preferNovelty?: boolean;
}): Promise<GeneratedPuzzleResult> {
  const optimalDifficulty = params.playerSkillLevel ?? 5;
  let adjustedDifficulty = optimalDifficulty;

  if (params.recentDifficulties && params.recentDifficulties.length >= 3) {
    const recentAvg =
      params.recentDifficulties.reduce((a, b) => a + b, 0) / params.recentDifficulties.length;
    adjustedDifficulty = Math.round((optimalDifficulty + recentAvg) / 2);
  }

  return generateMasterPuzzle({
    targetDifficulty: adjustedDifficulty,
    requireNovelty: params.preferNovelty,
    useLearningFeedback: true,
  });
}
