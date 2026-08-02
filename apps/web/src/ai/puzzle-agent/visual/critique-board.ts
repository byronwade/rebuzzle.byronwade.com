import { z } from "zod";
import { generateAIObjectFromImage } from "@/ai/client";
import { AI_CONFIG } from "@/ai/config";
import {
  type BoardProfileRecognitionResult,
  type BoardRecognitionResult,
  evaluateBoardPerceptionConsensus,
  evaluateBoardProfileConsensus,
} from "./board-consensus";
import type { PuzzleVisual } from "./composition";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "./presentation";
import { type RenderedPuzzleBoard, renderPuzzleVisualProfiles } from "./render-board";

const BoardPerceptionSchema = z.object({
  objects: z
    .array(
      z.object({
        label: z.string().min(1).max(60),
        confidence: z.number().min(0).max(1),
      })
    )
    .max(20),
  visibleText: z.array(z.string().max(80)).max(20),
  relationships: z.array(z.string().max(160)).max(10),
  hasClipping: z.boolean(),
  hasAccidentalOverlap: z.boolean(),
  unreadableElements: z.array(z.string().max(120)).max(10),
  overallConfidence: z.number().min(0).max(1),
});

async function judgeRenderedProfile(
  visual: PuzzleVisual,
  rendered: RenderedPuzzleBoard
): Promise<BoardProfileRecognitionResult> {
  const settled = await Promise.allSettled(
    AI_CONFIG.visualRecognition.models.map(async (modelId) => ({
      ...(await generateAIObjectFromImage({
        modelId,
        image: rendered.pixels,
        mediaType: "image/png",
        temperature: 0.1,
        schema: BoardPerceptionSchema,
        system: `You are inspecting a rendered rebus board exactly as a player sees it.
Report only visible evidence. Do not infer hidden creator intent or solve from metadata.
Name each concrete object literally, transcribe visible text, and describe spatial or typographic relationships.
When multiple marks form one familiar icon, name the whole symbol semantically (for example, a cloud with falling lines is a rain cloud) instead of splitting it into unrelated strokes.
Flag clipping, accidental overlap, broken wrapping, or anything unreadable.`,
        prompt: [
          "Inventory the visible objects, text, and relationships in this rebus board.",
          `This is the ${rendered.profileId} presentation: ${rendered.viewportWidth}px viewport and ${rendered.tileSize}px icon tiles.`,
        ].join("\n"),
      })),
      model: modelId,
    }))
  );
  const perceptions = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );
  const result = evaluateBoardPerceptionConsensus({
    visual,
    perceptions,
    requiredVotes: AI_CONFIG.visualRecognition.requiredVotes,
    minConfidence: AI_CONFIG.visualRecognition.minConfidence,
  });
  return {
    ...result,
    profileId: rendered.profileId,
    viewportWidth: rendered.viewportWidth,
    tileSize: rendered.tileSize,
    width: rendered.width,
    height: rendered.height,
    wrappedRows: rendered.wrappedRows,
  };
}

/** Blindly inspect every materially different production presentation. */
export async function recognizePuzzleBoard(visual: PuzzleVisual): Promise<BoardRecognitionResult> {
  if (!AI_CONFIG.visualRecognition.boardEnabled) {
    return { ok: true, perceptions: [], conceptVotes: {}, profileResults: [] };
  }

  try {
    const renderedProfiles = await renderPuzzleVisualProfiles(visual);
    const profileResults = await Promise.all(
      renderedProfiles.map((rendered) => judgeRenderedProfile(visual, rendered))
    );
    return evaluateBoardProfileConsensus({
      visual,
      profileResults,
      expectedProfileIds: PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => profile.id),
    });
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Rendered board recognition failed",
      perceptions: [],
      conceptVotes: {},
      profileResults: [],
    };
  }
}
