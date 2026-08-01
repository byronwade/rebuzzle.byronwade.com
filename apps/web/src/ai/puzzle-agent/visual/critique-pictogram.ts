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
  /** True when the recognition model call failed (caller may fall back to clarity-only) */
  skipped?: boolean;
};

/**
 * Ask a fast model to name the icon without knowing the intended concept.
 */
export async function recognizePictogramIcon(input: {
  svg: string;
  concept: string;
}): Promise<IconRecognitionResult> {
  try {
    const result = await generateAIObject({
      modelType: "fast",
      temperature: 0.15,
      schema: IconRecognitionSchema,
      system: `You are a player looking at a tiny 64×64 rebus puzzle icon (SVG markup).
Name the SINGLE concrete object you see. Be literal and picky.
If it is a vague blob, scribble, or unreadable, set seenLabel to "unclear" and isAmbiguous=true.
Do not invent details that are not in the drawing.
Return short redrawAdvice for making a clearer icon of a real object.`,
      prompt: [
        "What object is this SVG icon?",
        "SVG:",
        input.svg.slice(0, 8000),
      ].join("\n"),
    });

    const matchesConcept =
      result.seenLabel.toLowerCase() !== "unclear" &&
      !result.isAmbiguous &&
      result.confidence >= 0.5 &&
      conceptMatchesSeen(input.concept, result.seenLabel);

    return {
      ...result,
      matchesConcept,
      ok: matchesConcept,
      skipped: false,
    };
  } catch {
    return {
      seenLabel: "unknown",
      confidence: 0,
      alternateReadings: [],
      isAmbiguous: true,
      redrawAdvice: "Recognition unavailable — keep silhouette chunky and iconic",
      matchesConcept: false,
      ok: false,
      skipped: true,
    };
  }
}
