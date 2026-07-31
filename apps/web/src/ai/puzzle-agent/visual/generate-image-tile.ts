/**
 * Optional AI image tile for hybrid rebus boards.
 * Uses Vercel AI Gateway image models with a locked Rebuzzle illustration style.
 */

import { generateImage } from "ai";
import { ensureGatewayKey, getAiGateway } from "@/ai/client";
import { IMAGE_TILE_STYLE_GUIDE } from "./style";

export type GenerateImageTileInput = {
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
  const prompt = [
    IMAGE_TILE_STYLE_GUIDE,
    "",
    input.prompt.trim().slice(0, 400),
    "",
    "Square tile, single subject, no text in the image.",
  ].join("\n");

  ensureGatewayKey();

  let lastError = "no_model";
  for (const modelId of IMAGE_MODEL_CHAIN) {
    try {
      const result = await generateImage({
        model: getAiGateway().image(modelId),
        prompt,
        aspectRatio: "1:1",
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
