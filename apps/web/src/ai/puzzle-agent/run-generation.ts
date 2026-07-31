/**
 * Puzzle generation via ToolLoopAgent + Vercel AI Gateway.
 *
 * Mirrors the Eve agent tools/instructions for reliable in-process use from
 * server actions and cron (no HTTP session required).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gateway } from "@ai-sdk/gateway";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import { AI_CONFIG } from "../config";
import { enforceQuota } from "../quota-manager";
import {
  type PuzzleAgentResult,
  PuzzleAgentResultSchema,
} from "./schemas";
import { getDifficultyLevelForScore } from "./difficulty-levels";
import { fingerprintCandidate, scorePuzzleQuality } from "./tool-impl";
import { puzzleAgentTools } from "./tools";

export interface PuzzleGenerationParams {
  targetDifficulty: number;
  category?: string;
  theme?: string;
  requireNovelty?: boolean;
  qualityThreshold?: number;
  maxAttempts?: number;
  puzzleType?: string;
  userId?: string;
  useLearningFeedback?: boolean;
}

function loadInstructions(): string {
  try {
    return readFileSync(join(process.cwd(), "agent/instructions.md"), "utf8");
  } catch {
    return `You are Rebuzzle's puzzle architect. Use tools to inspect type specs, avoid recent answers, validate, check uniqueness, calibrate difficulty, and score quality. Return one publishable puzzle.`;
  }
}

function buildUserMessage(params: PuzzleGenerationParams): string {
  const puzzleType = params.puzzleType ?? "rebus";
  const qualityThreshold =
    params.qualityThreshold ?? AI_CONFIG.puzzleAgent.qualityThreshold;

  const level = getDifficultyLevelForScore(params.targetDifficulty);

  return [
    `Generate one publishable ${puzzleType} puzzle.`,
    `Target difficulty: ${params.targetDifficulty}/10 → tier ${level.label} (band ${level.min}–${level.max}).`,
    `Component budget: ${level.componentBudget.min}–${level.componentBudget.max} parts.`,
    params.category ? `Preferred category: ${params.category}.` : null,
    params.theme ? `Theme: ${params.theme}.` : null,
    params.requireNovelty !== false
      ? "Novelty is required — avoid recent answers and similar visuals."
      : null,
    `Quality threshold: overall >= ${qualityThreshold}; prefer funScore >= 65.`,
    "Workflow:",
    "1) get_puzzle_type_spec + get_difficulty_brief",
    "2) list_recent_answers + propose_concept_seeds",
    "3) assemble_visual_components + craft_hint_ladder",
    "4) validate → uniqueness → calibrate → stress_test_solvability → score_quality",
    "5) Revise until in-band, unique, solvable, publishable",
    "6) Return structured result with difficultyLevel + techniqueId",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Run the puzzle ToolLoopAgent against AI Gateway.
 */
export async function runPuzzleAgentGeneration(
  params: PuzzleGenerationParams
): Promise<PuzzleAgentResult> {
  await enforceQuota();

  const start = Date.now();
  const maxAttempts = params.maxAttempts ?? 2;
  const qualityThreshold =
    params.qualityThreshold ?? AI_CONFIG.puzzleAgent.qualityThreshold;
  const modelId = AI_CONFIG.puzzleAgent.model;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const agent = new ToolLoopAgent({
        model: gateway(modelId),
        instructions: loadInstructions(),
        tools: puzzleAgentTools,
        temperature: AI_CONFIG.generation.temperature.creative,
        stopWhen: stepCountIs(AI_CONFIG.puzzleAgent.maxSteps),
        output: Output.object({ schema: PuzzleAgentResultSchema }),
      });

      const result = await agent.generate({
        prompt: `${buildUserMessage(params)}\n\nAttempt ${attempt}/${maxAttempts}.`,
        abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.agent),
      });

      const output = result.output;
      if (!output) {
        throw new Error("Puzzle agent returned no structured output");
      }

      const puzzle = output.puzzle;
      const calibrated =
        output.metadata.calibratedDifficulty || puzzle.difficulty;
      const level = getDifficultyLevelForScore(
        params.targetDifficulty || calibrated
      );
      const fingerprint =
        output.metadata.fingerprint ||
        fingerprintCandidate({
          rebusPuzzle: puzzle.rebusPuzzle,
          answer: puzzle.answer,
          category: puzzle.category,
        });
      const quality =
        output.metadata.qualityScore > 0
          ? {
              overall: output.metadata.qualityScore,
              verdict: output.metadata.qualityVerdict,
              funScore: output.metadata.funScore,
            }
          : scorePuzzleQuality({
              ...puzzle,
              targetDifficulty: params.targetDifficulty,
            });

      if (quality.overall < qualityThreshold && attempt < maxAttempts) {
        lastError = new Error(
          `Quality ${quality.overall} below threshold ${qualityThreshold}`
        );
        continue;
      }

      const difficultyLevel =
        puzzle.difficultyLevel ||
        output.metadata.difficultyLevel ||
        level.label;

      return {
        ...output,
        puzzle: {
          ...puzzle,
          difficulty: calibrated,
          difficultyLevel,
        },
        metadata: {
          ...output.metadata,
          fingerprint,
          calibratedDifficulty: calibrated,
          difficultyLevel,
          qualityScore: quality.overall,
          qualityVerdict: quality.verdict,
          funScore: quality.funScore ?? output.metadata.funScore,
          generationAttempts: attempt,
          thinkingSummary:
            output.metadata.thinkingSummary ??
            `${difficultyLevel} puzzle via ToolLoopAgent + AI Gateway (${modelId}) in ${Date.now() - start}ms`,
        },
        status: "success",
        recommendations: output.recommendations ?? [],
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= maxAttempts) break;
    }
  }

  throw lastError ?? new Error("Puzzle agent generation failed");
}
