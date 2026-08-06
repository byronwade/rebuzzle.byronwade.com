/**
 * Fill catalog pictogram SVG / provenance on Studio boards before grading.
 */

import {
  buildUnicodeFallback,
  type PuzzleVisual,
  type VisualLayer,
} from "@/ai/puzzle-agent/visual/composition";
import { resolveCuratedPictogram } from "@/ai/puzzle-agent/visual/curated-pictograms";
import { INK_PICTOGRAM_STYLE_ID } from "@/ai/puzzle-agent/visual/style";

function emojiFallbackFor(concept: string): string {
  const cleaned = concept
    .replace(/[^a-z0-9]+/gi, "")
    .slice(0, 2)
    .toUpperCase();
  return cleaned || "◆";
}

export function hydrateStudioVisual(input: {
  layout?: PuzzleVisual["layout"];
  layers: VisualLayer[];
  caption?: string;
}): { visual: PuzzleVisual; issues: string[] } {
  const issues: string[] = [];
  const layers: VisualLayer[] = input.layers.map((layer) => {
    if (layer.kind === "image") {
      return {
        ...layer,
        x: layer.x,
        y: layer.y,
      };
    }
    if (layer.kind !== "pictogram") return layer;
    const curated = resolveCuratedPictogram(layer.concept);
    if (!curated) {
      issues.push(`Unknown pictogram concept "${layer.concept}" — pick from the catalog`);
      return {
        ...layer,
        emojiFallback: layer.emojiFallback || emojiFallbackFor(layer.concept),
      };
    }
    return {
      kind: "pictogram" as const,
      concept: curated.canonicalConcept,
      role: layer.role,
      svg: curated.svg,
      assetId: curated.assetId,
      source: "catalog" as const,
      emojiFallback: layer.emojiFallback || emojiFallbackFor(curated.canonicalConcept),
      x: layer.x,
      y: layer.y,
    };
  });

  const unicodeFallback = buildUnicodeFallback(layers) || "◆";
  return {
    visual: {
      styleId: INK_PICTOGRAM_STYLE_ID,
      mode: "composed",
      layout: input.layout ?? "row",
      layers,
      unicodeFallback,
      caption: input.caption,
    },
    issues,
  };
}
