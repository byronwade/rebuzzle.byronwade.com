/** Player simulation: answer-aware hint review plus screenshot-only blind solving. */

import { z } from "zod";
import { generateAIObject, generateAIObjectFromImage } from "../../client";
import { AI_CONFIG } from "../../config";
import type { PuzzleVisual } from "../visual/composition";
import { summarizeEditorialReviewAttempts } from "../visual/editorial-consensus";
import { runPuzzleEditorialTournament } from "../visual/editorial-review";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "../visual/presentation";
import { renderPuzzleVisualProfiles } from "../visual/render-board";
import { type BlindSolveAttempt, summarizeBlindSolveAttempts } from "./blind-solve-consensus";
import { type PlayerSimResult, PlayerSimSchema } from "./types";

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
    const hintReviewPromise = generateAIObject({
      modelType: "smart",
      temperature: AI_CONFIG.generation.temperature.balanced,
      schema: PlayerSimSchema,
      system: `You are a rebus editor reviewing the hint ladder after the answer is known.
Judge whether hints progress fairly from mechanism guidance to a final nudge.
Do not treat this answer-aware review as evidence that an unhinted player can solve the board.`,
      prompt: [
        `Review hint fairness for a ${input.tierLabel} rebus.`,
        `Board: ${input.rebusPuzzle}`,
        `Answer: ${input.answer}`,
        `Technique: ${input.techniqueId}`,
        `Explanation: ${input.explanation}`,
        `Hints: ${input.hints.map((hint, index) => `${index + 1}. ${hint}`).join(" | ")}`,
        "",
        "Return fairness flags and an editorial confidence. Solve-rate fields are provisional and will be replaced by blind screenshot attempts.",
      ].join("\n"),
    });

    if (!input.visual) return await hintReviewPromise;
    const [hintReview, attempts, editorialAttempts] = await Promise.all([
      hintReviewPromise,
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

    return {
      ...hintReview,
      firstWrongParses: blind.wrongParses,
      likelySolvePath: blind.likelySolvePath,
      estimatedSolveRate: blind.estimatedSolveRate,
      confidence: Math.min(hintReview.confidence, blind.confidence, editorial.confidence),
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
    };
  } catch {
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
      editorialReasons: ["Answer-aware screenshot review failed"],
    };
  }
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
