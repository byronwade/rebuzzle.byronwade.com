/**
 * Master Puzzle Generation
 *
 * Thin entry point over the Eve-aligned ToolLoopAgent (AI Gateway).
 * Keeps the public API used by daily generation, admin routes, and scripts.
 */

import {
  type PuzzleGenerationParams,
  runPuzzleAgentGeneration,
} from "../puzzle-agent/run-generation";
import type { PuzzleAgentResult } from "../puzzle-agent/schemas";

export type MasterGenerationParams = PuzzleGenerationParams;

export interface GeneratedPuzzleResult {
  puzzle: {
    rebusPuzzle: string;
    answer: string;
    difficulty: number;
    explanation: string;
    category: string;
    hints: string[];
  };
  metadata: {
    fingerprint: string;
    uniquenessScore: number;
    difficultyProfile: {
      overall: number;
      method: string;
    };
    calibratedDifficulty: number;
    qualityMetrics: {
      scores: { overall: number };
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
  };
  status: "success" | "retry" | "failed";
  recommendations: string[];
}

function toGeneratedResult(
  result: PuzzleAgentResult,
  generationTimeMs: number
): GeneratedPuzzleResult {
  return {
    puzzle: result.puzzle,
    metadata: {
      fingerprint: result.metadata.fingerprint,
      uniquenessScore: result.metadata.uniquenessScore,
      difficultyProfile: {
        overall: result.metadata.calibratedDifficulty,
        method: "eve-tool-agent",
      },
      calibratedDifficulty: result.metadata.calibratedDifficulty,
      qualityMetrics: {
        scores: { overall: result.metadata.qualityScore },
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
    },
    status: result.status,
    recommendations: result.recommendations ?? [],
  };
}

/**
 * Generate a high-quality unique puzzle via the Eve tool agent + AI Gateway.
 */
export async function generateMasterPuzzle(
  params: MasterGenerationParams
): Promise<GeneratedPuzzleResult> {
  const start = Date.now();
  console.log("[Master Generator] Eve tool-agent generation", {
    difficulty: params.targetDifficulty,
    puzzleType: params.puzzleType ?? "rebus",
  });

  const result = await runPuzzleAgentGeneration(params);
  return toGeneratedResult(result, Date.now() - start);
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
    qualityThreshold: 70,
  });
}
