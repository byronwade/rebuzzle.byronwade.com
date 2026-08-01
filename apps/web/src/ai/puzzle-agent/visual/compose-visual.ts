/**
 * Compose a full generative puzzle visual from Eve's layer plan.
 * Fills pictogram SVGs (+ optional image tiles) and validates budget/style.
 */

import { getDifficultyLevelForScore } from "../difficulty-levels";
import {
  computeFunScore,
  displayLeaksAnswer,
  isKnownTechniqueId,
} from "../quality";
import { getTechniques } from "../technique-library";
import {
  buildUnicodeFallback,
  countVisualParts,
  type PuzzleVisual,
  PuzzleVisualSchema,
  type VisualLayer,
} from "./composition";
import { generateImageTile } from "./generate-image-tile";
import { generatePictogram, type GeneratePictogramResult } from "./generate-pictogram";
import {
  isAbstractPictogramConcept,
  scorePictogramClarity,
} from "./pictogram-clarity";
import { INK_PICTOGRAM_STYLE_ID } from "./style";

type PictogramLayer = Extract<VisualLayer, { kind: "pictogram" }>;

function applyGeneratedPictogram(
  layer: PictogramLayer,
  pic: GeneratePictogramResult
): {
  layer: PictogramLayer;
  accepted: boolean;
  recognitionWeak: boolean;
} {
  // Hard recognition gate: only ship icons a blind viewer can name (ok=true).
  // Clarity-only keep is rejected for publish via recognitionOk=false.
  if (pic.svg && pic.ok) {
    return {
      layer: {
        ...layer,
        svg: pic.svg,
        emojiFallback: pic.emojiFallback || layer.emojiFallback,
        recognitionOk: true,
        seenAs: pic.seenAs,
        libraryIconId: pic.libraryIconId,
      },
      accepted: true,
      recognitionWeak: false,
    };
  }

  if (pic.svg && (pic.clarityScore ?? 0) >= 62) {
    return {
      layer: {
        ...layer,
        svg: pic.svg,
        emojiFallback: pic.emojiFallback || layer.emojiFallback,
        recognitionOk: false,
        seenAs: pic.seenAs ?? "unclear",
        libraryIconId: pic.libraryIconId,
      },
      accepted: true,
      recognitionWeak: true,
    };
  }

  return {
    layer: {
      ...layer,
      svg: undefined,
      emojiFallback: pic.emojiFallback || layer.emojiFallback,
      recognitionOk: false,
      seenAs: pic.seenAs,
      libraryIconId: pic.libraryIconId,
    },
    accepted: false,
    recognitionWeak: true,
  };
}

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

  let claritySum = 0;
  let clarityCount = 0;
  let recognitionSum = 0;
  let recognitionCount = 0;

  for (const layer of input.layers) {
    if (layer.kind === "pictogram") {
      if (isAbstractPictogramConcept(layer.concept)) {
        issues.push(
          `Abstract pictogram concept "${layer.concept}" — replace with a concrete drawable noun (clock, key, umbrella)`
        );
      }

      if (layer.svg && layer.svg.includes("<svg")) {
        const clarity = scorePictogramClarity(layer.svg);
        if (clarity.ok && layer.recognitionOk !== false) {
          filledLayers.push(layer);
          generated.pictograms += 1;
          claritySum += clarity.score;
          clarityCount += 1;
        } else {
          // Try a fresh draw before falling back to emoji
          const pic = await generatePictogram({
            concept: layer.concept,
            role: layer.role,
            emojiFallback: layer.emojiFallback,
            maxRetries: 2,
          });
          const applied = applyGeneratedPictogram(layer, pic);
          filledLayers.push(applied.layer);
          if (applied.accepted && applied.layer.svg) {
            generated.pictograms += 1;
            claritySum += pic.clarityScore ?? clarity.score;
            clarityCount += 1;
            if (typeof pic.recognitionConfidence === "number") {
              recognitionSum += pic.recognitionConfidence;
              recognitionCount += 1;
            }
            if (applied.recognitionWeak) {
              issues.push(
                `Pictogram "${layer.concept}" failed blind recognition (seen as ${pic.seenAs ?? "unclear"}) — redraw or pick a clearer noun`
              );
            }
          } else {
            generated.failedPictograms += 1;
            issues.push(
              `Unreadable pictogram for "${layer.concept}" (${clarity.reasons.join(", ") || "low clarity"}) — pick a more concrete noun`
            );
          }
        }
        continue;
      }
      const pic = await generatePictogram({
        concept: layer.concept,
        role: layer.role,
        emojiFallback: layer.emojiFallback,
        maxRetries: 2,
      });
      const applied = applyGeneratedPictogram(layer, pic);
      filledLayers.push(applied.layer);
      if (applied.accepted && applied.layer.svg) {
        generated.pictograms += 1;
        if (typeof pic.clarityScore === "number") {
          claritySum += pic.clarityScore;
          clarityCount += 1;
        }
        if (typeof pic.recognitionConfidence === "number") {
          recognitionSum += pic.recognitionConfidence;
          recognitionCount += 1;
        }
        if (applied.recognitionWeak) {
          issues.push(
            `Pictogram "${layer.concept}" failed blind recognition (seen as ${pic.seenAs ?? "unclear"}) — redraw or pick a clearer noun`
          );
        } else if (pic.libraryIconId?.startsWith("svgl:") || pic.librarySource === "brand") {
          tips.push(`Used SVGL brand logo ${pic.libraryIconId} for "${layer.concept}"`);
        } else if (pic.libraryIconId) {
          tips.push(`Used open icon pack ${pic.libraryIconId} for "${layer.concept}"`);
        }
      } else {
        generated.failedPictograms += 1;
        issues.push(
          `Pictogram "${layer.concept}" failed clarity/recognition — use a concrete drawable noun and redraw`
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
  const avgRecognitionConfidence =
    recognitionCount > 0 ? recognitionSum / recognitionCount : null;

  if (filledLayers.length === 0) {
    issues.push("No renderable layers after generation");
  }
  if (generated.failedPictograms > 0) {
    issues.push(
      `${generated.failedPictograms} pictogram(s) fell back to emoji — board is not fully generative`
    );
  }
  if (avgRecognitionConfidence !== null && avgRecognitionConfidence < 0.45) {
    tips.push("Icon recognition confidence is low — exaggerate identifying features");
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
