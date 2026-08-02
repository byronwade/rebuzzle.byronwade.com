/** Blind multi-size icon naming without exposing the intended concept to judges. */

import { z } from "zod";
import { generateAIObjectFromImage } from "@/ai/client";
import { AI_CONFIG } from "@/ai/config";
import { rasterizePictogramForRecognition } from "./rasterize-pictogram";
import {
  evaluateRecognitionConsensus,
  evaluateRecognitionProfiles,
  type IconRecognitionProfileResult,
  type IconRecognitionResult,
} from "./recognition-consensus";

const ICON_PLAYER_SIZES = [36, 72] as const;

const IconRecognitionSchema = z.object({
  seenLabel: z.string().min(1).max(48).describe("Concrete object name you see, or 'unclear'"),
  confidence: z.number().min(0).max(1),
  alternateReadings: z.array(z.string().max(40)).max(4),
  isAmbiguous: z.boolean(),
  redrawAdvice: z.string().max(200).describe("How to make the intended object unmistakable"),
});

export type { IconRecognitionResult } from "./recognition-consensus";

async function recognizeAtSize(input: {
  svg: string;
  concept: string;
  tileSize: number;
}): Promise<IconRecognitionProfileResult> {
  const pixels = await rasterizePictogramForRecognition(input.svg, input.tileSize);
  const settled = await Promise.allSettled(
    AI_CONFIG.visualRecognition.models.map(async (modelId) => ({
      ...(await generateAIObjectFromImage({
        modelId,
        image: pixels,
        mediaType: "image/png",
        temperature: 0.1,
        schema: IconRecognitionSchema,
        system: `You are a player seeing one tiny pictogram from a rebus puzzle.
Name the SINGLE concrete object visible in the rendered image. Be literal.
If it is a vague blob or unreadable, set seenLabel to "unclear" and isAmbiguous=true.
Do not infer the creator's intent and do not invent missing details.`,
        prompt: [
          "Blind recognition test: what concrete object is visible?",
          `The image was rendered at the real ${input.tileSize}px player size and enlarged without adding detail.`,
          "Return the literal object name, confidence, plausible alternate readings, ambiguity, and concise redraw advice.",
        ].join("\n"),
      })),
      model: modelId,
    }))
  );
  const judgments = settled.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : []
  );
  return {
    ...evaluateRecognitionConsensus({
      concept: input.concept,
      judgments,
      minConfidence: AI_CONFIG.visualRecognition.minConfidence,
      requiredVotes: AI_CONFIG.visualRecognition.requiredVotes,
    }),
    tileSize: input.tileSize,
  };
}

/**
 * Require independent recognition at both compact (36px) and large (72px)
 * player sizes. An unavailable size or judge is a publication failure.
 */
export async function recognizePictogramIcon(input: {
  svg: string;
  concept: string;
}): Promise<IconRecognitionResult> {
  try {
    const profileResults = await Promise.all(
      ICON_PLAYER_SIZES.map((tileSize) => recognizeAtSize({ ...input, tileSize }))
    );
    return evaluateRecognitionProfiles({
      profileResults,
      expectedTileSizes: ICON_PLAYER_SIZES,
    });
  } catch {
    return {
      seenLabel: "unclear",
      confidence: 0,
      alternateReadings: [],
      isAmbiguous: true,
      redrawAdvice: "Rendered recognition failed — redraw or use a vetted catalog icon.",
      matchesConcept: false,
      ok: false,
      judges: [],
      profileResults: [],
    };
  }
}
