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
import { isHardAIBudgetError, parseAIError } from "../errors";
import { enforceQuota } from "../quota-manager";
import { toPlayabilityEvidence } from "./apex/blind-solve-consensus";
import {
  applyPlayerSimHeuristics,
  playerSimPublishBlockers,
  simulatePlayerSolve,
} from "./apex/player-sim";
import {
  applyAuthoritativeComposition,
  type CapturedPuzzleComposition,
} from "./authoritative-draft";
import { getDifficultyLevelForScore } from "./difficulty-levels";
import { evaluatePublishGates } from "./quality";
import {
  normalizePuzzleAgentDraft,
  PuzzleAgentDraftSchema,
  type PuzzleAgentResult,
} from "./schemas";
import {
  calibratePuzzleDifficulty,
  checkUniqueness,
  fingerprintCandidate,
  scorePuzzleQuality,
  stressTestSolvability,
} from "./tool-impl";
import { puzzleAgentTools } from "./tools";
import { PuzzleVisualSchema } from "./visual/composition";
import { recognizePuzzleBoard } from "./visual/critique-board";
import { verifyPublicationAssets } from "./visual/publication-assets";

const PUBLICATION_AGENT_TOOLS = [
  "get_puzzle_type_spec",
  "get_difficulty_brief",
  "list_recent_answers",
  "propose_concept_seeds",
  "list_technique_library",
  "list_pictogram_catalog",
  "compose_puzzle_visual",
  "craft_hint_ladder",
] as const;

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

export class PuzzleCandidateRejectedError extends Error {
  readonly puzzle: PuzzleAgentResult["puzzle"];

  constructor(message: string, puzzle: PuzzleAgentResult["puzzle"]) {
    super(message);
    this.name = "PuzzleCandidateRejectedError";
    this.puzzle = puzzle;
  }
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
    "- Call list_pictogram_catalog before composing and use its exact reviewed concept IDs.",
    "- Never call generate_pictogram in publication generation; fresh art belongs in the review lab.",
    "- Use list_recent_answers techniqueId values to choose the least-recently-used allowed technique; never default blindly to the first technique.",
    "- Prefer ≥1 pictogram SVG; styled text (large/strike/stacked) is OK when typography is the joke.",
    "- Pictogram concepts must be concrete drawable nouns a stranger can sketch (key, umbrella, lighthouse).",
    "- Icons must be instantly recognizable — if compose reports clarity/recognition failure, redraw or change the noun.",
    "- Invent clever fair mechanisms — avoid overused tropes (before, sunflower, piece of cake) unless the twist is genuinely new.",
    "- funScore comes from technique fit + mapping clarity, NOT emoji/pictogram padding.",
    "- rebusPuzzle must equal visual.unicodeFallback when visual is present.",
    "- rebusPuzzle must be non-empty and must NOT equal or contain the answer.",
    "- Hints: vague → specific; never dump letter scaffolds before the final hint.",
    "- Do not self-grade or loop on validation tools; return the creative draft after composition and hints.",
    "- Rebuzzle independently validates uniqueness, difficulty, solvability, quality, provenance, and rendered recognition.",
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
    "1) In parallel: get_puzzle_type_spec + get_difficulty_brief + list_recent_answers + list_pictogram_catalog",
    "2) propose_concept_seeds + list_technique_library, then pick one catalog-compatible direction",
    "3) compose_puzzle_visual + craft_hint_ladder",
    "4) Return the strict puzzle draft with difficultyLevel + techniqueId + visual; the host owns all scoring and retries",
  ]
    .filter(Boolean)
    .join("\n");
}

function safeGenerationError(error: unknown): string {
  const messages: string[] = [];
  const visited = new Set<unknown>();
  let current: unknown = error;

  while (current && !visited.has(current) && messages.length < 4) {
    visited.add(current);
    if (current instanceof Error && current.message) messages.push(current.message);
    if (typeof current === "object") {
      const record = current as Record<string, unknown>;
      if (typeof record.responseBody === "string") messages.push(record.responseBody);
      current = record.cause;
    } else {
      break;
    }
  }

  return Array.from(new Set(messages))
    .join(" | ")
    .replace(/vck_[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 1200);
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
  const modelChainLimit = Math.max(
    1,
    // A model fallback repeats the complete agent loop. Default to one model so
    // a single daily puzzle cannot silently multiply premium-model spend.
    Math.min(3, Number(process.env.REBUZZLE_GENERATOR_MODEL_CHAIN_LIMIT || 1) || 1)
  );
  const modelChain = Array.from(
    new Set([AI_CONFIG.puzzleAgent.model, ...getGatewayModelChain("creative")])
  ).slice(0, modelChainLimit);

  let lastError: Error | null = null;
  let lastCandidateError: PuzzleCandidateRejectedError | null = null;
  let priorFailure: string | undefined;

  for (const modelId of modelChain) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let completedSteps = 0;
      const completedTools: string[] = [];
      let capturedComposition: CapturedPuzzleComposition | null = null;
      try {
        const agent = new ToolLoopAgent({
          model: getAiGateway()(modelId),
          instructions: loadInstructions(),
          tools: puzzleAgentTools,
          activeTools: [...PUBLICATION_AGENT_TOOLS],
          temperature: AI_CONFIG.generation.temperature.creative,
          maxOutputTokens: AI_CONFIG.generation.maxTokens.blog,
          stopWhen: stepCountIs(AI_CONFIG.puzzleAgent.maxSteps),
          output: Output.object({ schema: PuzzleAgentDraftSchema }),
          onStepEnd: ({ toolCalls }) => {
            completedSteps += 1;
            completedTools.push(...toolCalls.map((toolCall) => toolCall.toolName));
            if (process.env.REBUZZLE_GENERATOR_TRACE === "1") {
              console.log("[Puzzle Agent] step", {
                modelId,
                attempt,
                completedSteps,
                tools: toolCalls.map((toolCall) => toolCall.toolName),
              });
            }
          },
          onToolExecutionEnd: ({ toolCall, toolOutput }) => {
            if (
              toolCall.toolName !== "compose_puzzle_visual" ||
              toolOutput.type !== "tool-result"
            ) {
              return;
            }
            const output = toolOutput.output as { visual?: unknown };
            const input = toolCall.input as { answer?: unknown };
            const visual = PuzzleVisualSchema.safeParse(output.visual);
            if (visual.success && typeof input.answer === "string") {
              capturedComposition = { answer: input.answer, visual: visual.data };
            }
          },
        });

        const result = await agent.generate({
          prompt: `${buildUserMessage(params, priorFailure)}\n\nModel ${modelId} — attempt ${attempt}/${maxAttempts}.`,
          abortSignal: AbortSignal.timeout(AI_CONFIG.timeouts.agent),
        });

        const rawOutput = result.output;
        if (!rawOutput) {
          throw new Error("Puzzle agent returned no structured output");
        }

        const output = normalizePuzzleAgentDraft(rawOutput);
        if (!capturedComposition) {
          throw new Error("compose_puzzle_visual did not return a valid authoritative board");
        }
        const puzzle = applyAuthoritativeComposition(output.puzzle, capturedComposition);

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
          visual: puzzle.visual,
        });

        const quality = scorePuzzleQuality({
          ...puzzle,
          targetDifficulty,
          techniqueId: puzzle.techniqueId,
          visual: puzzle.visual,
        });

        const assetApproval = await verifyPublicationAssets(puzzle.visual);
        if (!assetApproval.ok) {
          priorFailure = assetApproval.reason;
          lastCandidateError = new PuzzleCandidateRejectedError(priorFailure, puzzle);
          lastError = lastCandidateError;
          if (process.env.REBUZZLE_GENERATOR_TRACE === "1") {
            console.warn("[Puzzle Agent] candidate rejected", {
              modelId,
              attempt,
              stage: "asset-approval",
              reason: priorFailure,
            });
          }
          continue;
        }

        const boardRecognition = await recognizePuzzleBoard(puzzle.visual);
        if (!boardRecognition.ok) {
          priorFailure = boardRecognition.reason ?? "Rendered board recognition failed";
          lastCandidateError = new PuzzleCandidateRejectedError(priorFailure, puzzle);
          lastError = lastCandidateError;
          if (process.env.REBUZZLE_GENERATOR_TRACE === "1") {
            console.warn("[Puzzle Agent] candidate rejected", {
              modelId,
              attempt,
              stage: "board-recognition",
              reason: priorFailure,
            });
          }
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
          uniquenessBlockers: uniqueness.noveltyBlockers,
          solvable: solvability.solvable,
          solvabilityBlockers: solvability.blockers,
          calibratedDifficulty: calibration.rawCalibrated,
          inBand: calibration.inBand,
        });

        if (!gate.ok) {
          priorFailure = gate.reason;
          lastCandidateError = new PuzzleCandidateRejectedError(gate.reason, puzzle);
          lastError = lastCandidateError;
          if (process.env.REBUZZLE_GENERATOR_TRACE === "1") {
            console.warn("[Puzzle Agent] candidate rejected", {
              modelId,
              attempt,
              stage: "publish-gates",
              reason: priorFailure,
            });
          }
          continue;
        }

        const rawSim = await simulatePlayerSolve({
          rebusPuzzle: puzzle.rebusPuzzle,
          answer: puzzle.answer,
          explanation: puzzle.explanation,
          hints: puzzle.hints,
          techniqueId: puzzle.techniqueId,
          tierLabel: puzzle.difficultyLevel,
          visual: puzzle.visual,
        });
        const sim = applyPlayerSimHeuristics(rawSim, {
          answer: puzzle.answer,
          hints: puzzle.hints,
          tierLabel: puzzle.difficultyLevel,
        });
        const playabilityBlockers = playerSimPublishBlockers(sim);
        if (playabilityBlockers.length) {
          priorFailure = `Rendered screenshot playability failed: ${playabilityBlockers.join(" | ")}`;
          lastCandidateError = new PuzzleCandidateRejectedError(priorFailure, puzzle);
          lastError = lastCandidateError;
          if (process.env.REBUZZLE_GENERATOR_TRACE === "1") {
            console.warn("[Puzzle Agent] candidate rejected", {
              modelId,
              attempt,
              stage: "screenshot-playability",
              reason: priorFailure,
            });
          }
          continue;
        }

        const level = getDifficultyLevelForScore(targetDifficulty);
        const fingerprint =
          uniqueness.fingerprint ||
          fingerprintCandidate({
            rebusPuzzle: puzzle.rebusPuzzle,
            answer: puzzle.answer,
            category: puzzle.category,
            visual: puzzle.visual,
          });

        const difficultyLevel = puzzle.difficultyLevel || level.label;

        // Prefer measured in-band calibration; fall back to tier target only if already gated in-band
        const calibrated = calibration.inBand ? calibration.calibratedDifficulty : level.target;

        return {
          puzzle: {
            ...puzzle,
            difficulty: calibrated,
            difficultyLevel,
            techniqueId: puzzle.techniqueId,
          },
          metadata: {
            fingerprint,
            uniquenessScore: uniqueness.uniquenessScore,
            noveltyEvidence: uniqueness.noveltyEvidence,
            calibratedDifficulty: calibrated,
            difficultyLevel,
            qualityScore: quality.overall,
            qualityVerdict: quality.verdict,
            funScore: quality.funScore,
            visualStyleId: puzzle.visual?.styleId,
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
            boardTextVotes: boardRecognition.perceptions.length
              ? boardRecognition.textVotes
              : undefined,
            boardOperatorVotes: boardRecognition.perceptions.length
              ? boardRecognition.operatorVotes
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
                  textVotes: profile.textVotes,
                  operatorVotes: profile.operatorVotes,
                  wrappedRows: profile.wrappedRows,
                }))
              : undefined,
            generationAttempts: attempt,
            thinkingSummary:
              output.thinkingSummary ??
              `${difficultyLevel} puzzle via Eve ToolLoopAgent + AI Gateway (${modelId}) in ${Date.now() - start}ms`,
            estimatedSolveRate: sim.estimatedSolveRate,
            playabilityEvidence: toPlayabilityEvidence(sim),
          },
          status: "success",
          recommendations: output.recommendations,
        };
      } catch (error) {
        if (isHardAIBudgetError(error)) {
          throw parseAIError(error);
        }
        const detail = safeGenerationError(error) || "Unknown puzzle generation error";
        lastError = new Error(
          `${detail} [model=${modelId}; attempt=${attempt}; completedSteps=${completedSteps}; tools=${Array.from(new Set(completedTools)).join(",") || "none"}]`,
          { cause: error }
        );
        priorFailure = lastError.message;
      }
    }
  }

  throw lastCandidateError ?? lastError ?? new Error("Puzzle agent generation failed");
}
