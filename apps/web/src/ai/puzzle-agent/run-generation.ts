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

  return [
    `Generate one publishable ${puzzleType} puzzle.`,
    `Target difficulty: ${params.targetDifficulty} (1-10).`,
    params.category ? `Preferred category: ${params.category}.` : null,
    params.theme ? `Theme: ${params.theme}.` : null,
    params.requireNovelty !== false
      ? "Novelty is required — avoid recent answers and similar visuals."
      : null,
    `Quality threshold: overall >= ${qualityThreshold}.`,
    "Workflow:",
    "1) get_puzzle_type_spec",
    "2) list_recent_answers",
    "3) Design visual/components + answer + hints + explanation",
    "4) validate_puzzle → check_uniqueness → calibrate_difficulty → score_quality",
    "5) Revise with tools if uniqueness or quality fails",
    "6) Return the final structured result",
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

      // Harden fingerprint / quality if the model omitted them
      const puzzle = output.puzzle;
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
            }
          : scorePuzzleQuality(puzzle);

      if (quality.overall < qualityThreshold && attempt < maxAttempts) {
        lastError = new Error(
          `Quality ${quality.overall} below threshold ${qualityThreshold}`
        );
        continue;
      }

      return {
        ...output,
        puzzle: {
          ...puzzle,
          difficulty: output.metadata.calibratedDifficulty || puzzle.difficulty,
        },
        metadata: {
          ...output.metadata,
          fingerprint,
          qualityScore: quality.overall,
          qualityVerdict: quality.verdict,
          generationAttempts: attempt,
          thinkingSummary:
            output.metadata.thinkingSummary ??
            `Generated via ToolLoopAgent + AI Gateway (${modelId}) in ${Date.now() - start}ms`,
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
