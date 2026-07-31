/**
 * Compose a full generative puzzle visual from Eve's layer plan.
 * Fills pictogram SVGs (+ optional image tiles) and validates budget/style.
 */

import { getDifficultyLevelForScore } from "../difficulty-levels";
import { getTechniques } from "../technique-library";
import {
  buildUnicodeFallback,
  countVisualParts,
  type PuzzleVisual,
  PuzzleVisualSchema,
  type VisualLayer,
} from "./composition";
import { generateImageTile } from "./generate-image-tile";
import { generatePictogram } from "./generate-pictogram";
import { INK_PICTOGRAM_STYLE_ID } from "./style";

export type ComposePuzzleVisualInput = {
  answer: string;
  targetDifficulty: number;
  techniqueId?: string;
  layout?: PuzzleVisual["layout"];
  layers: VisualLayer[];
  unicodeFallback?: string;
  caption?: string;
  /** When true, generate AI image tiles for image layers */
  renderImages?: boolean;
};

export type ComposePuzzleVisualResult = {
  visual: PuzzleVisual;
  totalParts: number;
  withinBudget: boolean;
  componentBudget: { min: number; max: number };
  funScore: number;
  issues: string[];
  tips: string[];
  generated: {
    pictograms: number;
    images: number;
    failedPictograms: number;
    failedImages: number;
  };
};

export async function composePuzzleVisual(
  input: ComposePuzzleVisualInput
): Promise<ComposePuzzleVisualResult> {
  const level = getDifficultyLevelForScore(input.targetDifficulty);
  const issues: string[] = [];
  const tips: string[] = [];
  const generated = {
    pictograms: 0,
    images: 0,
    failedPictograms: 0,
    failedImages: 0,
  };

  const filledLayers: VisualLayer[] = [];

  for (const layer of input.layers) {
    if (layer.kind === "pictogram") {
      if (layer.svg && layer.svg.includes("<svg")) {
        filledLayers.push(layer);
        generated.pictograms += 1;
        continue;
      }
      const pic = await generatePictogram({
        concept: layer.concept,
        role: layer.role,
        emojiFallback: layer.emojiFallback,
      });
      if (pic.ok && pic.svg) {
        filledLayers.push({
          ...layer,
          svg: pic.svg,
          emojiFallback: pic.emojiFallback,
        });
        generated.pictograms += 1;
      } else {
        generated.failedPictograms += 1;
        filledLayers.push({
          ...layer,
          emojiFallback: pic.emojiFallback || layer.emojiFallback,
        });
        tips.push(`Pictogram fallback used for "${layer.concept}" — unicode emoji only`);
      }
      continue;
    }

    if (layer.kind === "image") {
      if (layer.src) {
        filledLayers.push(layer);
        generated.images += 1;
        continue;
      }
      if (input.renderImages !== false) {
        const tile = await generateImageTile({
          prompt: layer.prompt,
          alt: layer.alt,
        });
        if (tile.ok && tile.src) {
          filledLayers.push({ ...layer, src: tile.src });
          generated.images += 1;
        } else {
          generated.failedImages += 1;
          tips.push(`Image tile skipped (${tile.error ?? "failed"}) — board still playable`);
          // Drop failed image layers rather than showing broken media
        }
      } else {
        tips.push("Image layer planned but renderImages=false");
      }
      continue;
    }

    filledLayers.push(layer);
  }

  if (filledLayers.length === 0) {
    issues.push("No renderable layers after generation");
  }

  const unicodeFallback =
    input.unicodeFallback?.trim() || buildUnicodeFallback(filledLayers) || "◆";

  const parsed = PuzzleVisualSchema.safeParse({
    styleId: INK_PICTOGRAM_STYLE_ID,
    mode: filledLayers.some((l) => l.kind === "image" && l.src)
      ? "hybrid"
      : filledLayers.some((l) => l.kind === "pictogram" && l.svg)
        ? "composed"
        : "unicode",
    layout: input.layout ?? "row",
    layers: filledLayers,
    unicodeFallback,
    caption: input.caption,
  });

  const visual: PuzzleVisual = parsed.success
    ? parsed.data
    : {
        styleId: INK_PICTOGRAM_STYLE_ID,
        mode: "unicode",
        layout: "row",
        layers: filledLayers.length
          ? filledLayers
          : [
              {
                kind: "text",
                content: unicodeFallback,
                emphasis: "normal",
              },
            ],
        unicodeFallback,
      };

  if (!parsed.success) {
    issues.push(`Visual schema issues: ${parsed.error.issues[0]?.message ?? "invalid"}`);
  }

  const totalParts = countVisualParts(visual);
  const withinBudget =
    totalParts >= level.componentBudget.min && totalParts <= level.componentBudget.max;

  if (totalParts < level.componentBudget.min) {
    issues.push(
      `Too sparse for ${level.label}: have ${totalParts} parts, want ≥ ${level.componentBudget.min}`
    );
  }
  if (totalParts > level.componentBudget.max) {
    issues.push(
      `Too dense for ${level.label}: have ${totalParts} parts, want ≤ ${level.componentBudget.max}`
    );
  }

  const answerLower = input.answer.toLowerCase().trim();
  if (answerLower.length > 3 && unicodeFallback.toLowerCase().includes(answerLower)) {
    issues.push("Answer text appears in the visual fallback — hide it");
  }
  for (const layer of visual.layers) {
    if (
      layer.kind === "text" &&
      layer.content.toLowerCase().includes(answerLower) &&
      answerLower.length > 3
    ) {
      issues.push("Answer text appears in a text layer — hide it");
    }
  }

  let techniqueBonus = -10;
  if (input.techniqueId) {
    const technique = getTechniques([input.techniqueId])[0];
    if (technique) {
      techniqueBonus = 20;
      tips.push(...technique.howToAssemble.slice(0, 2));
    } else {
      issues.push(`Unknown techniqueId: ${input.techniqueId}`);
    }
  }

  const pictogramBonus = Math.min(24, generated.pictograms * 8);
  const textLayers = visual.layers.filter((l) => l.kind === "text").length;
  const textBonus = Math.min(12, textLayers * 4);
  const imageBonus = Math.min(10, generated.images * 5);

  const funScore = Math.max(
    0,
    Math.min(
      100,
      48 + pictogramBonus + textBonus + imageBonus + techniqueBonus - issues.length * 12
    )
  );

  if (generated.pictograms === 0 && textLayers === 0) {
    tips.push("Prefer at least one custom pictogram or styled text layer for a generative board");
  }

  return {
    visual,
    totalParts,
    withinBudget,
    componentBudget: level.componentBudget,
    funScore,
    issues,
    tips,
    generated,
  };
}
