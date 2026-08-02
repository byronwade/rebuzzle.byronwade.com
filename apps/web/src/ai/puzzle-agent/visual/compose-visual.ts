/**
 * Compose a full generative puzzle visual from Eve's layer plan.
 * Fills pictogram SVGs (+ optional image tiles) and validates budget/style.
 */

import { getDifficultyLevelForScore } from "../difficulty-levels";
import { computeFunScore, displayLeaksAnswer, isKnownTechniqueId } from "../quality";
import { getTechniques } from "../technique-library";
import {
  buildUnicodeFallback,
  countVisualParts,
  type PuzzleVisual,
  PuzzleVisualSchema,
  type VisualLayer,
} from "./composition";
import { isAuthenticCuratedPictogram } from "./curated-pictograms";
import { generateImageTile } from "./generate-image-tile";
import { type GeneratePictogramInput, generatePictogram } from "./generate-pictogram";
import { scorePictogramClarity } from "./pictogram-clarity";
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
  /** Internal review tooling may display newly generated, unapproved assets. */
  assetUsage?: GeneratePictogramInput["usage"];
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

  let claritySum = 0;
  let clarityCount = 0;

  for (const layer of input.layers) {
    if (layer.kind === "pictogram") {
      if (layer.svg?.includes("<svg")) {
        const authenticCatalogAsset = isAuthenticCuratedPictogram({
          concept: layer.concept,
          assetId: layer.assetId,
          svg: layer.svg,
        });
        if (authenticCatalogAsset) {
          const clarity = scorePictogramClarity(layer.svg);
          filledLayers.push(layer);
          generated.pictograms += 1;
          claritySum += Math.max(90, clarity.score);
          clarityCount += 1;
          continue;
        }
        tips.push(
          `Ignored unverified inline SVG for "${layer.concept}" and resolved it through the approved asset pipeline`
        );
      }
      const pic = await generatePictogram({
        concept: layer.concept,
        role: layer.role,
        emojiFallback: layer.emojiFallback,
        maxRetries: 2,
        usage: input.assetUsage ?? "publication",
      });
      if (pic.ok && pic.svg) {
        filledLayers.push({
          ...layer,
          svg: pic.svg,
          emojiFallback: pic.emojiFallback,
          source: pic.source,
          assetId: pic.assetId,
          seenAs: pic.seenAs,
          recognitionConfidence: pic.recognitionConfidence,
          recognitionProfiles: pic.recognitionProfiles,
        });
        generated.pictograms += 1;
        if (typeof pic.clarityScore === "number") {
          claritySum += pic.clarityScore;
          clarityCount += 1;
        }
      } else {
        generated.failedPictograms += 1;
        filledLayers.push({
          ...layer,
          svg: undefined,
          emojiFallback: pic.emojiFallback || layer.emojiFallback,
        });
        issues.push(
          pic.error === "approved_asset_required"
            ? `Pictogram "${layer.concept}" is not in the approved catalog — choose an exact concept from list_pictogram_catalog`
            : `Pictogram "${layer.concept}" failed clarity/generation — use a more concrete noun or redraw`
        );
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

  const avgPictogramClarity = clarityCount > 0 ? claritySum / clarityCount : null;

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

  if (displayLeaksAnswer(unicodeFallback, input.answer)) {
    issues.push("Answer text appears in the visual fallback — hide it");
  }
  for (const layer of visual.layers) {
    if (layer.kind === "text" && displayLeaksAnswer(layer.content, input.answer)) {
      issues.push("Answer text appears in a text layer — hide it");
    }
  }

  if (input.techniqueId) {
    const technique = getTechniques([input.techniqueId])[0];
    if (technique) {
      tips.push(...technique.howToAssemble.slice(0, 2));
    } else {
      issues.push(`Unknown techniqueId: ${input.techniqueId}`);
    }
  } else {
    issues.push("Missing techniqueId for compose_puzzle_visual");
  }

  const textLayers = visual.layers.filter((l) => l.kind === "text").length;
  const styledText = visual.layers.some(
    (l) =>
      l.kind === "text" &&
      "emphasis" in l &&
      l.emphasis &&
      ["large", "small", "strike", "stacked", "tiny"].includes(l.emphasis)
  );
  const hasOperator = visual.layers.some((l) => l.kind === "operator");

  const funScore = computeFunScore({
    techniqueId: input.techniqueId,
    knownTechnique: isKnownTechniqueId(input.techniqueId),
    withinBudget,
    issueCount: issues.length,
    generativeParts: generated.pictograms + (styledText ? 1 : 0) + Math.min(1, generated.images),
    unicodeParts: visual.mode === "unicode" ? Math.max(1, textLayers) : 0,
    hasSpatialOrOperator: hasOperator || visual.layout === "stack" || visual.layout === "overlay",
    hasStyledText: styledText,
    explanationMapsWell: false,
    avgPictogramClarity,
  });

  if (generated.pictograms === 0 && textLayers === 0) {
    tips.push("Prefer at least one custom pictogram or styled text layer for a generative board");
  }
  if (generated.failedPictograms > 0) {
    tips.push(
      "Failed pictograms usually mean the concept was too abstract — pick a concrete noun (bee, clock, key)"
    );
  }
  if (visual.mode === "unicode") {
    issues.push("Compose fell back to unicode mode — regenerate pictogram SVGs before publishing");
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
