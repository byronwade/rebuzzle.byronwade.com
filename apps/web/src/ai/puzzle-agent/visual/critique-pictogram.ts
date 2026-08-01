/**
 * Blind icon naming — asks a model what object it sees (without the intended concept).
 * Catches "pretty but wrong" SVGs that pass shape heuristics.
 */

import { z } from "zod";
import { generateAIObject } from "@/ai/client";
import { conceptMatchesSeen } from "./icon-features";

const IconRecognitionSchema = z.object({
  seenLabel: z
    .string()
    .min(1)
    .max(48)
    .describe("Concrete object name you see, or 'unclear'"),
  confidence: z.number().min(0).max(1),
  alternateReadings: z.array(z.string().max(40)).max(4),
  isAmbiguous: z.boolean(),
  redrawAdvice: z
    .string()
    .max(200)
    .describe("How to make the intended object unmistakable"),
});

export type IconRecognitionResult = z.infer<typeof IconRecognitionSchema> & {
  matchesConcept: boolean;
  ok: boolean;
};

/**
 * Ask a fast model to name the icon without knowing the intended concept.
 * Soft-fails open (ok:true) if the critique model is unavailable.
 */
export async function recognizePictogramIcon(input: {
  svg: string;
  concept: string;
}): Promise<IconRecognitionResult> {
  try {
    const result = await generateAIObject({
      modelType: "fast",
      temperature: 0.2,
      schema: IconRecognitionSchema,
      system: `You are a player looking at a tiny 64×64 rebus puzzle icon (SVG markup).
Name the SINGLE concrete object you see. Be literal.
If it is a vague blob or unreadable, set seenLabel to "unclear" and isAmbiguous=true.
Do not invent details that are not in the drawing.
Return short redrawAdvice for making a clearer icon.`,
      prompt: [
        "What object is this SVG icon?",
        "SVG:",
        input.svg.slice(0, 8000),
      ].join("\n"),
    });

    const matchesConcept =
      result.seenLabel.toLowerCase() !== "unclear" &&
      !result.isAmbiguous &&
      result.confidence >= 0.45 &&
      conceptMatchesSeen(input.concept, result.seenLabel);

    return {
      ...result,
      matchesConcept,
      ok: matchesConcept,
    };
  } catch {
    // Don't block generation if recognition model fails
    return {
      seenLabel: "unknown",
      confidence: 0,
      alternateReadings: [],
      isAmbiguous: true,
      redrawAdvice: "Recognition unavailable — keep silhouette chunky and iconic",
      matchesConcept: true,
      ok: true,
    };
  }
}
