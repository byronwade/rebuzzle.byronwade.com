/**
 * Puzzle generation via ToolLoopAgent + Vercel AI Gateway.
 *
 * Mirrors the Eve agent tools/instructions for reliable in-process use from
 * server actions and cron (no HTTP session required).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Output, stepCountIs, ToolLoopAgent } from "ai";
import {
  assertGatewayAuthConfigured,
  ensureGatewayKey,
  getAiGateway,
  getGatewayModelChain,
} from "../client";
import { AI_CONFIG } from "../config";
import { enforceQuota } from "../quota-manager";
import { getDifficultyLevelForScore } from "./difficulty-levels";
import { evaluatePublishGates } from "./quality";
import { type PuzzleAgentResult, PuzzleAgentResultSchema } from "./schemas";
import {
  calibratePuzzleDifficulty,
  checkUniqueness,
  fingerprintCandidate,
  scorePuzzleQuality,
  stressTestSolvability,
} from "./tool-impl";
import { puzzleAgentTools } from "./tools";
import { recognizePuzzleBoard } from "./visual/critique-board";

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
  /** Apex curriculum brief text injected into the agent prompt */
  briefSummary?: string;
  /** Preferred techniques from diversity memory */
  preferredTechniques?: string[];
  /** Soft-banned techniques (recently overused) */
  avoidTechniques?: string[];
  /** Phrase-bank inspirations (not mandatory answers) */
  phraseSeeds?: string[];
  /** Banned normalized answer keys */
  bannedAnswerKeys?: string[];
  /** Tournament candidate slot (1-based) — encourages diversity across slots */
  candidateIndex?: number;
  candidateCount?: number;
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
    skill = readFileSync(join(process.cwd(), "agent/skills/generate-daily-puzzle.md"), "utf8");
  } catch {
    // optional
  }

  return [
    instructions,
    skill ? `\n\n## Skill: generate-daily-puzzle\n${skill}` : "",
    "",
    "## Hard publish rules (non-negotiable)",
    "- techniqueId is required and must be a real library id for the target tier.",
    "- ALWAYS call compose_puzzle_visual — unicode-only boards are rejected at publish.",
    "- Prefer ≥1 pictogram SVG; styled text (large/strike/stacked) is OK when typography is the joke.",
    "- Pictogram concepts must be concrete drawable nouns a stranger can sketch (key, umbrella, lighthouse).",
    "- Icons must be instantly recognizable — if compose reports clarity/recognition failure, redraw or change the noun.",
    "- Invent clever fair mechanisms — avoid overused tropes (before, sunflower, piece of cake) unless the twist is genuinely new.",
    "- funScore comes from technique fit + mapping clarity, NOT emoji/pictogram padding.",
    "- rebusPuzzle must equal visual.unicodeFallback when visual is present.",
    "- rebusPuzzle must be non-empty and must NOT equal or contain the answer.",
    "- Hints: vague → specific; never dump letter scaffolds before the final hint.",
    "- Pipeline must pass: validate → uniqueness → calibrate (in-band) → solvability → score_quality.",
    "- If validation fails, redesign the visual — do not bump scores or ship placeholders.",
  ].join("\n");
}

function buildUserMessage(params: PuzzleGenerationParams, priorFailure?: string): string {
  const puzzleType = params.puzzleType ?? "rebus";
  const qualityThreshold = params.qualityThreshold ?? AI_CONFIG.puzzleAgent.qualityThreshold;
  const minFun = AI_CONFIG.puzzleAgent.minFunScore;

  const level = getDifficultyLevelForScore(params.targetDifficulty);
  const preferred = params.preferredTechniques?.length
    ? params.preferredTechniques
    : level.techniques;

  const slot =
    params.candidateIndex && params.candidateCount
      ? `Tournament candidate ${params.candidateIndex}/${params.candidateCount} — invent a DISTINCT direction from other slots.`
      : null;

  return [
    `Generate one publishable ${puzzleType} puzzle.`,
    `Target difficulty: ${params.targetDifficulty}/10 → tier ${level.label} (band ${level.min}–${level.max}).`,
    `Component budget: ${level.componentBudget.min}–${level.componentBudget.max} parts.`,
    `Preferred techniques: ${preferred.join(", ")}.`,
    params.avoidTechniques?.length
      ? `Avoid overused techniques when possible: ${params.avoidTechniques.join(", ")}.`
      : null,
    params.category ? `Preferred category: ${params.category}.` : null,
    params.theme ? `Theme: ${params.theme}.` : null,
    params.phraseSeeds?.length
      ? `Phrase-bank tropes/seeds to avoid copying (invent a different mechanism/answer; cousins of bee/before/sunflower/piece-of-cake are discouraged): ${params.phraseSeeds.join("; ")}.`
      : null,
    params.bannedAnswerKeys?.length
      ? `Banned answer keys (normalized): ${params.bannedAnswerKeys.slice(0, 30).join(", ")}.`
      : null,
    params.briefSummary ? `Curriculum brief: ${params.briefSummary}` : null,
    slot,
    params.requireNovelty !== false
      ? "Novelty is required — avoid recent answers and similar visuals."
      : null,
    `Quality gates: overall >= ${qualityThreshold}, funScore >= ${minFun}, publishable=true, unique, solvable, in-band, composed visual.`,
    priorFailure ? `Previous attempt failed: ${priorFailure}. Fix that specific issue.` : null,
    "Workflow:",
    "1) get_puzzle_type_spec + get_difficulty_brief + get_generation_brief (if available)",
    "2) list_recent_answers + propose_concept_seeds",
    "3) list_technique_library → pick techniqueId, then compose_puzzle_visual + craft_hint_ladder",
    "4) validate → uniqueness → calibrate → stress_test_solvability → score_quality",
    "5) Optional: critique_candidate + simulate_player_solve, then revise",
    "6) Return structured result with difficultyLevel + techniqueId + visual",
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
  ensureGatewayKey();
  assertGatewayAuthConfigured();
  await enforceQuota();

  const start = Date.now();
  const maxAttempts = params.maxAttempts ?? AI_CONFIG.puzzleAgent.maxAttempts ?? 3;
  const qualityThreshold = params.qualityThreshold ?? AI_CONFIG.puzzleAgent.qualityThreshold;
  const minFun = AI_CONFIG.puzzleAgent.minFunScore;

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
          model: getAiGateway()(modelId),
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

        // Keep share string aligned with generative board
        if (puzzle.visual?.unicodeFallback) {
          puzzle.rebusPuzzle = puzzle.visual.unicodeFallback;
        }

        const targetDifficulty = params.targetDifficulty || puzzle.difficulty;

        const [uniqueness, calibration] = await Promise.all([
          checkUniqueness({
            rebusPuzzle: puzzle.rebusPuzzle,
            answer: puzzle.answer,
            category: puzzle.category,
            difficulty: puzzle.difficulty,
            explanation: puzzle.explanation,
            hints: puzzle.hints,
            techniqueId: puzzle.techniqueId,
            visual: puzzle.visual,
          }),
          calibratePuzzleDifficulty({
            rebusPuzzle: puzzle.rebusPuzzle,
            answer: puzzle.answer,
            category: puzzle.category,
            difficulty: puzzle.difficulty,
            explanation: puzzle.explanation,
            hints: puzzle.hints,
            puzzleType: params.puzzleType ?? "rebus",
            targetDifficulty,
          }),
        ]);

        const solvability = stressTestSolvability({
          rebusPuzzle: puzzle.rebusPuzzle,
          answer: puzzle.answer,
          category: puzzle.category,
          difficulty: puzzle.difficulty,
          explanation: puzzle.explanation,
          hints: puzzle.hints,
          techniqueId: puzzle.techniqueId,
          targetDifficulty,
        });

        const quality = scorePuzzleQuality({
          ...puzzle,
          targetDifficulty,
          techniqueId: puzzle.techniqueId,
          visual: puzzle.visual,
        });

        const boardRecognition = await recognizePuzzleBoard(puzzle.visual);
        if (!boardRecognition.ok) {
          priorFailure = boardRecognition.reason ?? "Rendered board recognition failed";
          lastError = new Error(priorFailure);
          continue;
        }

        const gate = evaluatePublishGates({
          rebusPuzzle: puzzle.rebusPuzzle,
          answer: puzzle.answer,
          explanation: puzzle.explanation,
          hints: puzzle.hints,
          techniqueId: puzzle.techniqueId,
          difficulty: puzzle.difficulty,
          targetDifficulty,
          qualityOverall: quality.overall,
          funScore: quality.funScore,
          qualityThreshold,
          minFunScore: minFun,
          publishable: quality.publishable,
          qualityIssues: quality.issues,
          visual: puzzle.visual,
          isUnique: uniqueness.isUnique,
          uniquenessScore: uniqueness.uniquenessScore,
          solvable: solvability.solvable,
          solvabilityBlockers: solvability.blockers,
          calibratedDifficulty: calibration.rawCalibrated,
          inBand: calibration.inBand,
        });

        if (!gate.ok) {
          priorFailure = gate.reason;
          lastError = new Error(gate.reason);
          continue;
        }

        const level = getDifficultyLevelForScore(targetDifficulty);
        const fingerprint =
          uniqueness.fingerprint ||
          output.metadata.fingerprint ||
          fingerprintCandidate({
            rebusPuzzle: puzzle.rebusPuzzle,
            answer: puzzle.answer,
            category: puzzle.category,
            visual: puzzle.visual,
          });

        const difficultyLevel =
          puzzle.difficultyLevel || output.metadata.difficultyLevel || level.label;

        // Prefer measured in-band calibration; fall back to tier target only if already gated in-band
        const calibrated = calibration.inBand ? calibration.calibratedDifficulty : level.target;

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
            uniquenessScore: uniqueness.uniquenessScore,
            noveltyEvidence: uniqueness.noveltyEvidence,
            calibratedDifficulty: calibrated,
            difficultyLevel,
            qualityScore: quality.overall,
            qualityVerdict: quality.verdict,
            funScore: quality.funScore ?? output.metadata.funScore,
            visualStyleId: puzzle.visual?.styleId ?? output.metadata.visualStyleId,
            boardRecognitionConfidence: boardRecognition.perceptions.length
              ? Math.min(
                  ...boardRecognition.perceptions.map((perception) =>
                    Math.max(0, Math.min(1, perception.overallConfidence))
                  )
                )
              : undefined,
            boardRecognitionModels: boardRecognition.perceptions.length
              ? boardRecognition.perceptions.map((perception) => perception.model)
              : undefined,
            boardConceptVotes: boardRecognition.perceptions.length
              ? boardRecognition.conceptVotes
              : undefined,
            boardRecognitionProfiles: boardRecognition.profileResults?.length
              ? boardRecognition.profileResults.map((profile) => ({
                  profileId: profile.profileId,
                  viewportWidth: profile.viewportWidth,
                  tileSize: profile.tileSize,
                  confidence: profile.perceptions.length
                    ? Math.min(
                        ...profile.perceptions.map((perception) =>
                          Math.max(0, Math.min(1, perception.overallConfidence))
                        )
                      )
                    : 0,
                  models: profile.perceptions.map((perception) => perception.model),
                  conceptVotes: profile.conceptVotes,
                  wrappedRows: profile.wrappedRows,
                }))
              : undefined,
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
