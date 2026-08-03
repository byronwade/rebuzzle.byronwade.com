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
import {
  answerSeedCuePlanIssues,
  formatAnswerSeedCuePlan,
  missingAnswerSeedCues,
} from "./apex/answer-seed-cues";
import { toPlayabilityEvidence } from "./apex/blind-solve-consensus";
import { preflightComposeAnswerSeedCuePlan } from "./apex/cue-plan-preflight";
import {
  applyPlayerSimHeuristics,
  playerSimPublishBlockers,
  simulatePlayerSolve,
} from "./apex/player-sim";
import type { AnswerSeedVisualCue } from "./apex/types";
import {
  applyAuthoritativeComposition,
  type CapturedPuzzleComposition,
} from "./authoritative-draft";
import { getDifficultyLevelForScore } from "./difficulty-levels";
import { evaluatePublishGates, normalizeAnswerKey } from "./quality";
import {
  normalizePuzzleAgentDraft,
  PuzzleAgentDraftSchema,
  type PuzzleAgentResult,
} from "./schemas";
import { evaluateSemanticAlignment } from "./semantic-alignment";
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
  "get_generation_brief",
  "list_recent_answers",
  "propose_concept_seeds",
  "list_technique_library",
  "list_pictogram_catalog",
  "inspect_answer_seed_cues",
  "preflight_compose_cue_plan",
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
  /** Apex answer-first contract; when present the model must preserve this answer. */
  answerSeed?: string;
  /** Host-owned visual ingredients that the composed board must contain. */
  answerSeedCuePlan?: readonly AnswerSeedVisualCue[];
  /** Banned normalized answer keys */
  bannedAnswerKeys?: string[];
  /** Tournament candidate slot (1-based) — encourages diversity across slots */
  candidateIndex?: number;
  candidateCount?: number;
  /** Apex pre-ranking can defer costly rendered recognition and play simulation. */
  deferRenderedEvaluation?: boolean;
  /** Specific model-backed critique instructions for one bounded repair pass. */
  revisionInstructions?: string[];
  /**
   * `critique-locked` — repair specialist: preserve answer + cue plan; rewrite
   * the board only for reviseInstructions (no re-seed invent).
   */
  repairMode?: "critique-locked";
  /** Keep a repair pass from silently multiplying spend through model fallbacks. */
  modelChainLimit?: number;
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
    "- When an answer-seed cue contract is present: inspect_answer_seed_cues (or use the host preflight layers) before compose.",
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

function buildUserMessage(
  params: PuzzleGenerationParams,
  priorFailure?: string,
  preflight?: {
    unicodeFallback: string;
    layerSummary: string;
  }
): string {
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
    params.answerSeed
      ? [
          `ANSWER-FIRST CONTRACT: the intended answer is exactly "${params.answerSeed}".`,
          "Backform one clean, fair visual mechanism from that answer using catalog-backed cues.",
          "Do not substitute a different answer; if the seed cannot be composed fairly, let the host reject this attempt.",
        ].join("\n")
      : null,
    params.answerSeedCuePlan?.length
      ? [
          `MANDATORY ANSWER-SEED CUE CONTRACT: place every ingredient below in the authoritative board: ${formatAnswerSeedCuePlan(params.answerSeedCuePlan)}.`,
          "Catalog cues are exact reviewed pictogram concepts; do not replace them with a vaguely related icon.",
          "Text/operator cues must remain visibly present and support the named technique. Keep the complete answer hidden as a contiguous phrase.",
        ].join("\n")
      : null,
    preflight
      ? [
          "HOST CUE-PLAN PREFLIGHT (already composed, zero invent): reuse these exact ingredients.",
          `Preflight unicodeFallback: ${preflight.unicodeFallback}`,
          `Preflight layers: ${preflight.layerSummary}`,
          "Call compose_puzzle_visual with the same concepts/text/operators (you may refine layout/emphasis only).",
        ].join("\n")
      : null,
    params.phraseSeeds?.length
      ? `Phrase-bank tropes/seeds to avoid copying (invent a different mechanism/answer; cousins of bee/before/sunflower/piece-of-cake are discouraged): ${params.phraseSeeds.join("; ")}.`
      : null,
    params.bannedAnswerKeys?.length
      ? `Banned answer keys (normalized): ${params.bannedAnswerKeys.slice(0, 30).join(", ")}.`
      : null,
    params.briefSummary ? `Curriculum brief: ${params.briefSummary}` : null,
    params.revisionInstructions?.length
      ? [
          params.repairMode === "critique-locked"
            ? "CRITIQUE-LOCKED REPAIR: keep the exact answer and every answer-seed cue. Rewrite layout/emphasis/supporting layers only."
            : "Bounded repair pass: address every critique instruction below with a new, cleaner board.",
          "Do not invent a replacement answer or swap catalog cues; use the locked cue plan and preserve a fair hint ladder.",
          `Critique instructions: ${params.revisionInstructions.slice(0, 4).join("; ")}`,
        ].join("\n")
      : null,
    slot,
    params.requireNovelty !== false
      ? "Novelty is required — avoid recent answers and similar visuals."
      : null,
    `Quality gates: overall >= ${qualityThreshold}, funScore >= ${minFun}, publishable=true, unique, solvable, in-band, composed visual.`,
    priorFailure ? `Previous attempt failed: ${priorFailure}. Fix that specific issue.` : null,
    "Workflow:",
    params.answerSeedCuePlan?.length
      ? "1) In parallel: get_puzzle_type_spec + get_difficulty_brief + list_pictogram_catalog + inspect_answer_seed_cues"
      : "1) In parallel: get_puzzle_type_spec + get_difficulty_brief + list_recent_answers + list_pictogram_catalog",
    params.answerSeedCuePlan?.length
      ? "2) compose_puzzle_visual using the host cue-plan layers (or preflight_compose_cue_plan), then craft_hint_ladder"
      : "2) propose_concept_seeds + list_technique_library, then pick one catalog-compatible direction",
    params.answerSeedCuePlan?.length
      ? "3) Return the strict puzzle draft with difficultyLevel + techniqueId + visual; the host owns all scoring and retries"
      : "3) compose_puzzle_visual + craft_hint_ladder",
    params.answerSeedCuePlan?.length
      ? null
      : "4) Return the strict puzzle draft with difficultyLevel + techniqueId + visual; the host owns all scoring and retries",
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
  const cuePlanIssues = answerSeedCuePlanIssues(params.answerSeedCuePlan);
  if (cuePlanIssues.length) {
    throw new Error(`Invalid answer-seed cue contract: ${cuePlanIssues.join("; ")}`);
  }

  // Cheap host preflight: prove cue plan composes before any invent spend.
  let hostPreflightComposition: CapturedPuzzleComposition | null = null;
  let hostPreflightPrompt: { unicodeFallback: string; layerSummary: string } | undefined;
  if (params.answerSeed && params.answerSeedCuePlan?.length) {
    const preflight = await preflightComposeAnswerSeedCuePlan({
      answer: params.answerSeed,
      targetDifficulty: params.targetDifficulty,
      techniqueId: params.preferredTechniques?.[0],
      cues: params.answerSeedCuePlan,
    });
    if (!preflight.ok || !preflight.composition) {
      throw new Error(
        `Cue-plan preflight failed (${preflight.stage}): ${preflight.issues.join("; ")}`
      );
    }
    hostPreflightComposition = {
      answer: params.answerSeed,
      visual: preflight.composition.visual,
    };
    hostPreflightPrompt = {
      unicodeFallback: preflight.composition.visual.unicodeFallback,
      layerSummary: preflight.composition.visual.layers
        .map((layer) => {
          if (layer.kind === "pictogram") return `pictogram:${layer.concept}`;
          if (layer.kind === "text") return `text:${layer.content}`;
          if (layer.kind === "operator") return `op:${layer.symbol}`;
          return `image:${layer.concept ?? "scene"}`;
        })
        .join(" | "),
    };
    if (process.env.REBUZZLE_GENERATOR_TRACE === "1") {
      console.log("[Puzzle Agent] cue-plan preflight ok", {
        answer: params.answerSeed,
        unicodeFallback: hostPreflightPrompt.unicodeFallback,
        layers: hostPreflightPrompt.layerSummary,
      });
    }
  }

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
    Math.min(
      3,
      params.modelChainLimit ?? (Number(process.env.REBUZZLE_GENERATOR_MODEL_CHAIN_LIMIT || 1) || 1)
    )
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
      let capturedComposition: CapturedPuzzleComposition | null = hostPreflightComposition;
      try {
        const agent = new ToolLoopAgent({
          model: getAiGateway()(modelId),
          instructions: loadInstructions(),
          tools: puzzleAgentTools,
          activeTools: [...PUBLICATION_AGENT_TOOLS],
          temperature: AI_CONFIG.generation.temperature.creative,
          maxOutputTokens: AI_CONFIG.generation.maxTokens.blog,
          maxRetries: 0,
          providerOptions: {
            gateway: { tags: ["rebuzzle", "operation:puzzle-agent"] },
          },
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
              (toolCall.toolName !== "compose_puzzle_visual" &&
                toolCall.toolName !== "preflight_compose_cue_plan") ||
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
          prompt: `${buildUserMessage(params, priorFailure, hostPreflightPrompt)}\n\nModel ${modelId} — attempt ${attempt}/${maxAttempts}.`,
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

        if (
          params.answerSeed &&
          normalizeAnswerKey(puzzle.answer) !== normalizeAnswerKey(params.answerSeed)
        ) {
          priorFailure = `Answer-first seed mismatch: expected "${params.answerSeed}" but received "${puzzle.answer}"`;
          lastCandidateError = new PuzzleCandidateRejectedError(priorFailure, puzzle);
          lastError = lastCandidateError;
          continue;
        }

        const missingSeedCues = missingAnswerSeedCues({
          visual: puzzle.visual,
          cues: params.answerSeedCuePlan,
        });
        if (missingSeedCues.length) {
          priorFailure = `Answer-first visual cue contract failed: ${missingSeedCues.join("; ")}`;
          lastCandidateError = new PuzzleCandidateRejectedError(priorFailure, puzzle);
          lastError = lastCandidateError;
          if (process.env.REBUZZLE_GENERATOR_TRACE === "1") {
            console.warn("[Puzzle Agent] candidate rejected", {
              modelId,
              attempt,
              stage: "answer-seed-cue-contract",
              reason: priorFailure,
            });
          }
          continue;
        }

        // Asset provenance is a cheap, fail-closed gate. Run it before novelty
        // and difficulty evaluation so an unapproved/generated pictogram cannot
        // consume additional database or model budget.
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

        // Semantic alignment is deterministic and intentionally runs before
        // novelty, calibration, and all model-backed recognition. It catches
        // a board whose visible parts cannot plausibly produce its answer.
        const semanticAlignment = evaluateSemanticAlignment({
          answer: puzzle.answer,
          techniqueId: puzzle.techniqueId,
          explanation: puzzle.explanation,
          visual: puzzle.visual,
        });
        if (!semanticAlignment.ok) {
          priorFailure = `Semantic alignment failed (${semanticAlignment.rule}): ${semanticAlignment.blockers.join("; ")}`;
          lastCandidateError = new PuzzleCandidateRejectedError(priorFailure, puzzle);
          lastError = lastCandidateError;
          if (process.env.REBUZZLE_GENERATOR_TRACE === "1") {
            console.warn("[Puzzle Agent] candidate rejected", {
              modelId,
              attempt,
              stage: "semantic-alignment",
              reason: priorFailure,
              score: semanticAlignment.score,
              warnings: semanticAlignment.warnings,
            });
          }
          continue;
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
          visual: puzzle.visual,
        });

        const quality = scorePuzzleQuality({
          ...puzzle,
          targetDifficulty,
          techniqueId: puzzle.techniqueId,
          visual: puzzle.visual,
        });

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
        // Prefer measured in-band calibration; fall back to tier target only if already gated in-band.
        const calibrated = calibration.inBand ? calibration.calibratedDifficulty : level.target;

        if (params.deferRenderedEvaluation) {
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
              answerSeed: params.answerSeed,
              answerSeedCuePlan: params.answerSeedCuePlan
                ? [...params.answerSeedCuePlan]
                : undefined,
              generationAttempts: attempt,
              thinkingSummary:
                output.thinkingSummary ??
                `${difficultyLevel} puzzle draft via Eve ToolLoopAgent + AI Gateway (${modelId}) in ${Date.now() - start}ms`,
            },
            status: "success",
            recommendations: output.recommendations,
          };
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
            answerSeed: params.answerSeed,
            answerSeedCuePlan: params.answerSeedCuePlan ? [...params.answerSeedCuePlan] : undefined,
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
