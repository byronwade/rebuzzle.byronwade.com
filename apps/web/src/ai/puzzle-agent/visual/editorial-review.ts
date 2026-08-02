import { z } from "zod";
import { generateAIObjectFromImage } from "../../client";
import { AI_CONFIG } from "../../config";
import type { PuzzleVisual } from "./composition";
import { EDITORIAL_FAILURE_KINDS, type EditorialReviewAttempt } from "./editorial-consensus";
import { renderPuzzleVisualProfiles } from "./render-board";

const EditorialReviewSchema = z.object({
  verdict: z.enum(["publish", "reject"]),
  confidence: z.number().min(0).max(1),
  cueCoverage: z.number().min(0).max(1),
  answerVisibleVerbatim: z.boolean(),
  failureKinds: z.array(z.enum(EDITORIAL_FAILURE_KINDS)).max(6),
  strongestAlternate: z.string().max(100).optional(),
  reason: z.string().min(1).max(300),
});

/**
 * Answer-aware screenshot review is a rejection lane only. It never supplies
 * solve credit: blind screenshot attempts remain the sole solvability signal.
 */
export async function runPuzzleEditorialTournament(input: {
  visual: PuzzleVisual;
  answer: string;
}): Promise<EditorialReviewAttempt[]> {
  const renderedProfiles = await renderPuzzleVisualProfiles(input.visual);
  const settled = await Promise.allSettled(
    renderedProfiles.flatMap((rendered) =>
      AI_CONFIG.visualRecognition.models.map(async (modelId) => ({
        ...(await generateAIObjectFromImage({
          modelId,
          image: rendered.pixels,
          mediaType: "image/png",
          temperature: 0.1,
          schema: EditorialReviewSchema,
          system: `You are a strict independent rebus editor reviewing the exact screenshot a player sees.
The intended answer is supplied only so you can verify cue coverage, detect answer leakage, and identify stronger alternate readings.
Do not approve a board merely because you now know its answer. Every word or idea in the answer must be visibly and fairly encoded.
Reject wrong objects, missing cues, verbatim answer leakage, ambiguous stronger readings, broken responsive layout, overlap, clipping, or unreadable content.`,
          prompt: [
            `Intended answer: ${input.answer}`,
            `Presentation: ${rendered.profileId}, ${rendered.viewportWidth}px viewport, ${rendered.tileSize}px icon tiles.`,
            "Would this exact screenshot be fair and publishable for a player who was not told the answer?",
          ].join("\n"),
        })),
        model: modelId,
        profileId: rendered.profileId,
      }))
    )
  );
  return settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}
