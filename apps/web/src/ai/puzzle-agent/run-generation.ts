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
import { ensureGatewayKey, getGatewayModelChain } from "../client";
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
  const fallback = `You are Rebuzzle's puzzle architect. Use tools to inspect type specs, avoid recent answers, validate, check uniqueness, calibrate difficulty, and score quality. Return one publishable puzzle.`;

  let instructions = fallback;
  try {
    instructions = readFileSync(join(process.cwd(), "agent/instructions.md"), "utf8");
  } catch {
    // keep fallback
  }

  let skill = "";
  try {
    skill = readFileSync(
      join(process.cwd(), "agent/skills/generate-daily-puzzle.md"),
      "utf8"
    );
  } catch {
    // optional
  }

  return [
    instructions,
    skill
      ? `\n\n## Skill: generate-daily-puzzle\n${skill}`
      : "",
    "",
    "## Hard publish rules (non-negotiable)",
    "- techniqueId is required — pick a real technique from the library; no emoji salad.",
    "- funScore must come from technique fit + clever wordplay, NOT emoji count padding.",
    "- rebusPuzzle must be non-empty and must NOT equal or contain the answer.",
    "- Require overall quality ≥ threshold, funScore ≥ 65, unique, solvable, in-band difficulty.",
    "- If validation fails, redesign the visual — do not bump scores or ship placeholders.",
  ].join("\n");
}

function buildUserMessage(params: PuzzleGenerationParams, priorFailure?: string): string {
  const puzzleType = params.puzzleType ?? "rebus";
  const qualityThreshold =
    params.qualityThreshold ?? AI_CONFIG.puzzleAgent.qualityThreshold;
  const minFun = AI_CONFIG.puzzleAgent.minFunScore;

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
    `Quality gates: overall >= ${qualityThreshold}, funScore >= ${minFun}, publishable=true, unique, solvable.`,
    priorFailure ? `Previous attempt failed: ${priorFailure}. Fix that specific issue.` : null,
    "Workflow:",
    "1) get_puzzle_type_spec + get_difficulty_brief",
    "2) list_recent_answers + propose_concept_seeds",
    "3) list_technique_library → pick techniqueId, then assemble_visual_components + craft_hint_ladder",
    "4) validate → uniqueness → calibrate → stress_test_solvability → score_quality",
    "5) Revise until in-band, unique, solvable, publishable",
    "6) Return structured result with difficultyLevel + techniqueId",
  ]
    .filter(Boolean)
    .join("\n");
}

function passesPublishGates(
  puzzle: {
    rebusPuzzle: string;
    answer: string;
    techniqueId?: string;
  },
  quality: { overall: number; funScore?: number; publishable?: boolean; issues?: string[] },
  qualityThreshold: number
): { ok: true } | { ok: false; reason: string } {
  const display = (puzzle.rebusPuzzle || "").trim();
  const answer = (puzzle.answer || "").trim();
  const minFun = AI_CONFIG.puzzleAgent.minFunScore;

  if (!display) return { ok: false, reason: "Empty puzzle display" };
  if (!answer) return { ok: false, reason: "Empty answer" };
  if (display.toLowerCase() === answer.toLowerCase()) {
    return { ok: false, reason: "Puzzle text equals answer" };
  }
  if (answer.length > 3 && display.toLowerCase().includes(answer.toLowerCase())) {
    return { ok: false, reason: "Answer leaked into puzzle text" };
  }
  if (!puzzle.techniqueId) {
    return { ok: false, reason: "Missing techniqueId" };
  }
  if (quality.overall < qualityThreshold) {
    return {
      ok: false,
      reason: `Quality ${quality.overall} below threshold ${qualityThreshold}`,
    };
  }
  if ((quality.funScore ?? 0) < minFun) {
    return {
      ok: false,
      reason: `funScore ${quality.funScore ?? 0} below ${minFun}`,
    };
  }
  if (quality.publishable === false) {
    return {
      ok: false,
      reason: `Not publishable: ${(quality.issues || []).join("; ") || "failed quality checks"}`,
    };
  }
  return { ok: true };
}

/**
 * Run the puzzle ToolLoopAgent against AI Gateway.
 */
export async function runPuzzleAgentGeneration(
  params: PuzzleGenerationParams
): Promise<PuzzleAgentResult> {
  ensureGatewayKey();
  await enforceQuota();

  const start = Date.now();
  const maxAttempts =
    params.maxAttempts ?? AI_CONFIG.puzzleAgent.maxAttempts ?? 3;
  const qualityThreshold =
    params.qualityThreshold ?? AI_CONFIG.puzzleAgent.qualityThreshold;

  // Primary Eve model, then creative-tier fallbacks
  const modelChain = Array.from(
    new Set([AI_CONFIG.puzzleAgent.model, ...getGatewayModelChain("creative")])
  ).slice(0, 3);

  let lastError: Error | null = null;
  let priorFailure: string | undefined;

  for (const modelId of modelChain) {
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
          prompt: `${buildUserMessage(params, priorFailure)}\n\nModel ${modelId} — attempt ${attempt}/${maxAttempts}.`,
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

        const quality = scorePuzzleQuality({
          ...puzzle,
          targetDifficulty: params.targetDifficulty,
          techniqueId: puzzle.techniqueId,
        });

        const gate = passesPublishGates(
          {
            rebusPuzzle: puzzle.rebusPuzzle,
            answer: puzzle.answer,
            techniqueId: puzzle.techniqueId,
          },
          {
            overall: quality.overall,
            funScore: quality.funScore,
            publishable: quality.publishable,
            issues: quality.issues,
          },
          qualityThreshold
        );

        if (!gate.ok) {
          priorFailure = gate.reason;
          lastError = new Error(gate.reason);
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
            techniqueId: puzzle.techniqueId,
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
              `${difficultyLevel} puzzle via Eve ToolLoopAgent + AI Gateway (${modelId}) in ${Date.now() - start}ms`,
          },
          status: "success",
          recommendations: output.recommendations ?? [],
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        priorFailure = lastError.message;
      }
    }
  }

  throw lastError ?? new Error("Puzzle agent generation failed");
}
