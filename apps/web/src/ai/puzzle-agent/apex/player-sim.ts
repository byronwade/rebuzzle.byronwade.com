/** Player simulation: answer-aware hint review plus screenshot-only blind solving. */

import { z } from "zod";
import { generateAIObjectFromImage } from "../../client";
import { AI_CONFIG } from "../../config";
import { hintLeaksAnswerEarly } from "../quality";
import type { PuzzleVisual } from "../visual/composition";
import {
  editorialReviewPublishBlockers,
  summarizeEditorialReviewAttempts,
} from "../visual/editorial-consensus";
import { runPuzzleEditorialTournament } from "../visual/editorial-review";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "../visual/presentation";
import { renderPuzzleVisualProfiles } from "../visual/render-board";
import {
  type BlindSolveAttempt,
  blindSolvePublishBlockers,
  summarizeBlindSolveAttempts,
} from "./blind-solve-consensus";
import {
  progressiveHintPublishBlockers,
  shouldRunProgressiveHintVision,
} from "./progressive-hint-vision";
import type { PlayerSimResult } from "./types";

export { shouldRunProgressiveHintVision } from "./progressive-hint-vision";

const BlindSolveSchema = z.object({
  visibleElements: z.array(z.string().max(100)).max(20),
  relationships: z.array(z.string().max(180)).max(12),
  hypotheses: z
    .array(
      z.object({
        answer: z.string().min(1).max(100),
        confidence: z.number().min(0).max(1),
        rationale: z.string().max(240),
      })
    )
    .min(1)
    .max(5),
  confidence: z.number().min(0).max(1),
});

function safeSimulationError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/vck_[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 300);
}

/** Blindly solve one supplied image with every configured independent judge. */
export async function runBlindSolveImageTournament(input: {
  image: Uint8Array;
  mediaType: string;
  tierLabel: string;
  profileId: string;
  presentation?: string;
}): Promise<BlindSolveAttempt[]> {
  const settled = await Promise.allSettled(
    AI_CONFIG.visualRecognition.models.map(async (modelId) => ({
      ...(await generateAIObjectFromImage({
        modelId,
        image: input.image,
        mediaType: input.mediaType,
        temperature: 0.35,
        operation: "vision-blind-solve",
        schema: BlindSolveSchema,
        system: `You are a clever but non-expert player seeing a rebus puzzle for the first time.
You do not know the intended answer, icon labels, technique, explanation, or hints.
Inventory visible evidence, reason from spatial and typographic relationships, and return up to five honest answer hypotheses.
Never claim confidence from information that is not visible in the screenshot.`,
        prompt: [
          `Blindly solve this ${input.tierLabel} rebus screenshot.`,
          `Presentation: ${input.presentation ?? input.profileId}.`,
        ].join("\n"),
      })),
      model: modelId,
      profileId: input.profileId,
    }))
  );
  return settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

/** Run independent models against every production board profile without answer metadata. */
export async function runBlindSolveTournament(input: {
  visual: PuzzleVisual;
  tierLabel: string;
}): Promise<BlindSolveAttempt[]> {
  const renderedProfiles = await renderPuzzleVisualProfiles(input.visual);
  const attempts = await Promise.all(
    renderedProfiles.map((rendered) =>
      runBlindSolveImageTournament({
        image: rendered.pixels,
        mediaType: "image/png",
        tierLabel: input.tierLabel,
        profileId: rendered.profileId,
        presentation: `${rendered.profileId}, ${rendered.viewportWidth}px viewport, ${rendered.tileSize}px icons`,
      })
    )
  );
  return attempts.flat();
}

/**
 * Progressive-hint vision: judges see the board plus early hints (never the final
 * spoiler). Used after a weak blind solve to verify the ladder unlocks a fair reading.
 */
export async function runHintedSolveTournament(input: {
  visual: PuzzleVisual;
  tierLabel: string;
  hints: string[];
}): Promise<BlindSolveAttempt[]> {
  const earlyHints = input.hints.slice(0, Math.max(0, input.hints.length - 1)).slice(0, 3);
  if (!earlyHints.length) return [];

  // Spend control: one mid-size production profile is enough for unlock evidence.
  const renderedProfiles = await renderPuzzleVisualProfiles(input.visual);
  const profile =
    renderedProfiles.find((entry) => entry.profileId.includes("375")) ??
    renderedProfiles.find((entry) => entry.profileId.includes("mobile")) ??
    renderedProfiles[0];
  if (!profile) return [];

  const settled = await Promise.allSettled(
    AI_CONFIG.visualRecognition.models.map(async (modelId) => ({
      ...(await generateAIObjectFromImage({
        modelId,
        image: profile.pixels,
        mediaType: "image/png",
        temperature: 0.35,
        operation: "vision-hinted-solve",
        schema: BlindSolveSchema,
        system: `You are a clever but non-expert player solving a rebus with progressive hints.
You do not know the intended answer, icon labels, technique, or explanation.
Use the screenshot first; treat hints as soft unlocks, not spoilers to invent invisible objects.
Return up to five honest answer hypotheses grounded in visible evidence + the hints.`,
        prompt: [
          `Solve this ${input.tierLabel} rebus screenshot with progressive hints.`,
          `Presentation: ${profile.profileId}, ${profile.viewportWidth}px viewport, ${profile.tileSize}px icons.`,
          "Hints (earliest → later; final spoiler withheld):",
          ...earlyHints.map((hint, index) => `${index + 1}. ${hint}`),
        ].join("\n"),
      })),
      model: modelId,
      profileId: `hinted:${profile.profileId}`,
    }))
  );
  return settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

export async function simulatePlayerSolve(input: {
  rebusPuzzle: string;
  answer: string;
  explanation: string;
  hints: string[];
  techniqueId: string;
  tierLabel: string;
  visual?: PuzzleVisual;
}): Promise<PlayerSimResult> {
  try {
    const hintProblems = hintLeaksAnswerEarly(input.hints, input.answer);
    const hintReview = {
      firstWrongParses: [] as string[],
      likelySolvePath: input.explanation,
      hintUnlockOrderLooksFair: hintProblems.length === 0,
      unfairReasons: hintProblems,
      estimatedSolveRate: 0,
      confidence: 1,
    };

    if (!input.visual) return hintReview;
    const [attempts, editorialAttempts] = await Promise.all([
      runBlindSolveTournament({ visual: input.visual, tierLabel: input.tierLabel }),
      runPuzzleEditorialTournament({ visual: input.visual, answer: input.answer }),
    ]);
    const blind = summarizeBlindSolveAttempts({ answer: input.answer, attempts });
    const editorial = summarizeEditorialReviewAttempts({
      attempts: editorialAttempts,
      expectedProfileIds: PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => profile.id),
      requiredVotes: AI_CONFIG.visualRecognition.requiredVotes,
      minConfidence: AI_CONFIG.visualRecognition.minConfidence,
    });

    let hintedAttempted = false;
    let hintedTopTargetFoundBy = 0;
    let hintedEstimatedSolveRate = 0;
    let hintedConfidence = 0;
    let hintedUnlocksVisualSolve = true;
    const unfairReasons = [...hintReview.unfairReasons];

    if (
      shouldRunProgressiveHintVision(blind) &&
      input.hints.length >= 2 &&
      process.env.REBUZZLE_SKIP_HINTED_VISION !== "1"
    ) {
      hintedAttempted = true;
      const hintedAttempts = await runHintedSolveTournament({
        visual: input.visual,
        tierLabel: input.tierLabel,
        hints: input.hints,
      });
      const hinted = summarizeBlindSolveAttempts({
        answer: input.answer,
        attempts: hintedAttempts,
      });
      hintedTopTargetFoundBy = hinted.topTargetFoundBy;
      hintedEstimatedSolveRate = hinted.estimatedSolveRate;
      hintedConfidence = hinted.confidence;
      // Early hints should unlock a top-rank reading when blind dominance failed.
      hintedUnlocksVisualSolve = hinted.topTargetFoundBy >= Math.max(1, hinted.requiredVotes);
      if (!hintedUnlocksVisualSolve) {
        unfairReasons.push(
          "Progressive hints did not unlock a fair visual solve of the intended answer"
        );
      }
    }

    return {
      ...hintReview,
      unfairReasons,
      hintUnlockOrderLooksFair: hintReview.hintUnlockOrderLooksFair && hintedUnlocksVisualSolve,
      firstWrongParses: blind.wrongParses,
      likelySolvePath: blind.likelySolvePath,
      estimatedSolveRate: blind.estimatedSolveRate,
      confidence: Math.min(
        hintReview.confidence,
        blind.confidence,
        editorial.confidence,
        hintedAttempted ? Math.max(hintedConfidence, 0.45) : 1
      ),
      blindProfileCount: blind.profileCount,
      blindProfilesWithTarget: blind.profilesWithTarget,
      blindTopTargetFoundBy: blind.topTargetFoundBy,
      blindDominantTargetFoundBy: blind.dominantTargetFoundBy,
      blindProfilesWithTopTarget: blind.profilesWithTopTarget,
      blindProfilesWithDominantTarget: blind.profilesWithDominantTarget,
      blindMeanReciprocalRank: blind.meanReciprocalRank,
      blindStrongestWrongConfidence: blind.strongestWrongConfidence,
      blindRequiredVotes: blind.requiredVotes,
      blindProfileResults: blind.profileResults,
      editorialProfileCount: editorial.profileCount,
      editorialAcceptedProfiles: editorial.acceptedProfiles,
      editorialConfidence: editorial.confidence,
      editorialFailureKinds: editorial.failureKinds,
      editorialReasons: editorial.reasons,
      hintedAttempted,
      hintedTopTargetFoundBy,
      hintedEstimatedSolveRate,
      hintedConfidence,
      hintedUnlocksVisualSolve,
    };
  } catch (error) {
    const failure = safeSimulationError(error);
    if (process.env.REBUZZLE_GENERATOR_TRACE === "1") {
      console.warn("[Player Sim] screenshot tournament failed", failure);
    }
    return {
      firstWrongParses: [],
      likelySolvePath: "Blind screenshot simulation unavailable",
      hintUnlockOrderLooksFair: false,
      unfairReasons: ["Blind screenshot simulation failed"],
      estimatedSolveRate: 0,
      confidence: 0,
      blindProfileCount: 0,
      blindProfilesWithTarget: 0,
      blindTopTargetFoundBy: 0,
      blindDominantTargetFoundBy: 0,
      blindProfilesWithTopTarget: 0,
      blindProfilesWithDominantTarget: 0,
      blindMeanReciprocalRank: 0,
      blindStrongestWrongConfidence: 0,
      blindRequiredVotes: AI_CONFIG.visualRecognition.requiredVotes,
      blindProfileResults: [],
      editorialProfileCount: 0,
      editorialAcceptedProfiles: 0,
      editorialConfidence: 0,
      editorialFailureKinds: [],
      editorialReasons: [`Answer-aware screenshot review failed: ${failure}`],
    };
  }
}

/** Consolidate every answer-blind, answer-aware, and hint fairness blocker. */
export function playerSimPublishBlockers(sim: PlayerSimResult): string[] {
  return Array.from(
    new Set([
      ...blindSolvePublishBlockers(sim),
      ...editorialReviewPublishBlockers(sim),
      ...progressiveHintPublishBlockers(sim),
      ...(!sim.hintUnlockOrderLooksFair || sim.unfairReasons.length > 2
        ? sim.unfairReasons.length
          ? sim.unfairReasons
          : ["Player simulation rejected the hint ladder"]
        : []),
    ])
  );
}

/** Deterministic fairness heuristics layered on top of model simulation. */
export function applyPlayerSimHeuristics(
  sim: PlayerSimResult,
  input: { answer: string; hints: string[]; tierLabel: string }
): PlayerSimResult {
  const unfairReasons = [...sim.unfairReasons];
  let hintUnlockOrderLooksFair = sim.hintUnlockOrderLooksFair;
  const answerLower = input.answer.toLowerCase();
  input.hints.slice(0, -1).forEach((hint, index) => {
    if (hint.toLowerCase().includes(answerLower)) {
      unfairReasons.push(`Hint ${index + 1} contains the full answer`);
      hintUnlockOrderLooksFair = false;
    }
  });
  if (input.tierLabel === "Impossible" && sim.estimatedSolveRate > 0.7) {
    return {
      ...sim,
      estimatedSolveRate: Math.min(sim.estimatedSolveRate, 0.55),
      hintUnlockOrderLooksFair,
      unfairReasons,
    };
  }
  return { ...sim, hintUnlockOrderLooksFair, unfairReasons };
}
