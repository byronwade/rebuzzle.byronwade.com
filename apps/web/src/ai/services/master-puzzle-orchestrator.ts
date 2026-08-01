/**
 * Master Puzzle Generation
 *
 * Thin entry point over Apex (tournament) or classic Eve ToolLoopAgent.
 * Keeps the public API used by daily generation, admin routes, and scripts.
 */

import { AI_CONFIG } from "../config";
import { runApexGeneration } from "../puzzle-agent/apex";
import {
  type PuzzleGenerationParams,
  runPuzzleAgentGeneration,
} from "../puzzle-agent/run-generation";
import type { PuzzleAgentResult } from "../puzzle-agent/schemas";
import type { PuzzleVisual } from "../puzzle-agent/visual/composition";
import { runSmartEvePipeline } from "../puzzle-agent/workflow";

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
    engine?: "apex" | "eve" | "eve-workflow";
    estimatedSolveRate?: number;
    simCalibrationBias?: number;
  };
  status: "success" | "retry" | "failed";
  recommendations: string[];
}

function toGeneratedResult(
  result: PuzzleAgentResult,
  generationTimeMs: number,
  engine: "apex" | "eve" | "eve-workflow"
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
      difficultyProfile: {
        overall: result.metadata.calibratedDifficulty,
        method:
          engine === "eve-workflow"
            ? "eve-durable-workflow"
            : engine === "apex"
              ? "apex-tournament"
              : "eve-tool-agent",
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
      estimatedSolveRate: result.metadata.estimatedSolveRate,
      simCalibrationBias: result.metadata.simCalibrationBias,
    },
    status: result.status,
    recommendations: result.recommendations ?? [],
  };
}

function apexEnabled(params: MasterGenerationParams): boolean {
  if (params.candidateCount === 1) return false;
  return AI_CONFIG.puzzleAgent.apex.enabled !== false;
}

/**
 * Generate a high-quality unique puzzle.
 * Prefer durable Eve workflow / smart pipeline, then Apex, then classic Eve.
 */
export async function generateMasterPuzzle(
  params: MasterGenerationParams
): Promise<GeneratedPuzzleResult> {
  const start = Date.now();
  const useWorkflow = AI_CONFIG.puzzleAgent.workflow.enabled;
  const useApex = apexEnabled(params);

  console.log("[Master Generator] starting", {
    engine: useWorkflow ? "eve-workflow" : useApex ? "apex" : "eve",
    difficulty: params.targetDifficulty,
    puzzleType: params.puzzleType ?? "rebus",
    candidates: useWorkflow || useApex ? AI_CONFIG.puzzleAgent.apex.candidateCount : 1,
    workflowSync: AI_CONFIG.puzzleAgent.workflow.syncOnly,
  });

  if (useWorkflow) {
    try {
      if (AI_CONFIG.puzzleAgent.workflow.syncOnly) {
        const result = await runSmartEvePipeline({
          ...params,
          useLearningFeedback: params.useLearningFeedback !== false,
        });
        return toGeneratedResult(result, Date.now() - start, "eve-workflow");
      }

      const { start: startWorkflow } = await import("workflow/api");
      const { generateEvePuzzleWorkflow } = await import(
        "@/workflows/eve-puzzle-generation"
      );
      const run = await startWorkflow(generateEvePuzzleWorkflow, [
        {
          ...params,
          useLearningFeedback: params.useLearningFeedback !== false,
        },
      ]);
      const result = await run.returnValue;
      return toGeneratedResult(result, Date.now() - start, "eve-workflow");
    } catch (workflowError) {
      console.warn("[Master Generator] Eve workflow failed — falling back to Apex/Eve", {
        error:
          workflowError instanceof Error
            ? workflowError.message
            : String(workflowError),
      });
    }
  }

  try {
    if (useApex) {
      const result = await runApexGeneration({
        ...params,
        useLearningFeedback: params.useLearningFeedback !== false,
      });
      return toGeneratedResult(result, Date.now() - start, "apex");
    }
  } catch (apexError) {
    console.warn("[Master Generator] Apex failed — falling back to Eve", {
      error: apexError instanceof Error ? apexError.message : String(apexError),
    });
  }

  const result = await runPuzzleAgentGeneration(params);
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
  const optimalDifficulty = params.playerSkillLevel ?? 8;
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
