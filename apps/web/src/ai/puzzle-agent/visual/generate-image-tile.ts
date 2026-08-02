/**
 * Optional AI image tile for hybrid rebus boards.
 * Uses Vercel AI Gateway image models with a locked Rebuzzle illustration style.
 */

import type { GatewayProviderOptions } from "@ai-sdk/gateway";
import { generateImage } from "ai";
import { ensureGatewayKey, getAiGateway } from "@/ai/client";
import { IMAGE_TILE_STYLE_GUIDE } from "./style";

export type GenerateImageTileInput = {
  concept: string;
  prompt: string;
  alt: string;
};

export type GenerateImageTileResult = {
  ok: boolean;
  src?: string;
  alt: string;
  model?: string;
  error?: string;
};

const IMAGE_MODEL_CHAIN = [
  process.env.REBUZZLE_IMAGE_MODEL,
  "google/imagen-4.0-fast-generate-001",
  "openai/gpt-image-1",
  "black-forest-labs/flux-1.1-pro",
].filter((m): m is string => Boolean(m));

export async function generateImageTile(
  input: GenerateImageTileInput
): Promise<GenerateImageTileResult> {
  const alt = input.alt.trim().slice(0, 120) || "Puzzle illustration";
  const concept = input.concept.trim().slice(0, 48);
  if (!concept) return { ok: false, alt, error: "missing_recognition_concept" };
  const subject = input.prompt.trim().slice(0, 400);
  const prompt = [
    IMAGE_TILE_STYLE_GUIDE,
    "",
    `Required recognizable subject: ${concept}.`,
    subject,
    "",
    "Square tile. ONE instantly recognizable subject. Bold silhouette. No text in the image.",
    "Avoid abstract blobs, busy backgrounds, collages, and tiny unreadable details.",
  ].join("\n");

  ensureGatewayKey();

  let lastError = "no_model";
  for (const modelId of IMAGE_MODEL_CHAIN) {
    try {
      const result = await generateImage({
        model: getAiGateway().image(modelId),
        prompt,
        aspectRatio: "1:1",
        maxRetries: 0,
        providerOptions: {
          gateway: {
            tags: ["rebuzzle", "operation:puzzle-image"],
          } satisfies GatewayProviderOptions,
        },
      });

      const file = result.image;
      if (!file) {
        lastError = "empty_image";
        continue;
      }

      const mediaType = file.mediaType || "image/png";
      const base64 = file.base64;
      if (!base64 || base64.length > 400_000) {
        // Keep Mongo documents sane — skip oversized tiles
        lastError = "image_too_large";
        continue;
      }

      return {
        ok: true,
        src: `data:${mediaType};base64,${base64}`,
        alt,
        model: modelId,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "generate_failed";
    }
  }

  return { ok: false, alt, error: lastError };
}
