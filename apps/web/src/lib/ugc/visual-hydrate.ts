/**
 * Fill catalog pictogram SVG / provenance on Studio boards before grading.
 */

import {
  buildUnicodeFallback,
  type PuzzleVisual,
  type VisualLayer,
} from "@/ai/puzzle-agent/visual/composition";
import {
  isApprovedCuratedPictogramReading,
  resolveCuratedPictogram,
  resolveCuratedPictogramByAssetId,
} from "@/ai/puzzle-agent/visual/curated-pictograms";
import { listOriginalPictogramCandidates } from "@/ai/puzzle-agent/visual/original-pictograms";
import { sanitizePictogramSvg } from "@/ai/puzzle-agent/visual/sanitize-svg";
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
    const curated = layer.assetId
      ? resolveCuratedPictogramByAssetId(layer.assetId)
      : resolveCuratedPictogram(layer.concept);
    if (!curated || !isApprovedCuratedPictogramReading(curated.assetId, layer.concept)) {
      issues.push(
        `Unsupported pictogram reading or asset "${layer.concept}" — pick an approved reading from the catalog`
      );
      return {
        ...layer,
        emojiFallback: layer.emojiFallback || emojiFallbackFor(layer.concept),
      };
    }
    return {
      kind: "pictogram" as const,
      concept: layer.concept,
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

/** Server grading path. Explicit originals require current audited approval. */
export async function hydrateStudioVisualWithApprovals(
  input: Parameters<typeof hydrateStudioVisual>[0]
): Promise<ReturnType<typeof hydrateStudioVisual> & { verifiedOriginalAssetIds: string[] }> {
  const result = {
    ...hydrateStudioVisual({ ...input, layers: [] }),
    verifiedOriginalAssetIds: [] as string[],
  };
  for (const layer of input.layers) {
    if (layer.kind !== "pictogram" || !layer.assetId?.startsWith("rebuzzle-ink:")) {
      const hydrated = hydrateStudioVisual({ layers: [layer] });
      result.visual.layers.push(...hydrated.visual.layers);
      result.issues.push(...hydrated.issues);
      continue;
    }
    const original = listOriginalPictogramCandidates().find(
      (asset) => asset.assetId === layer.assetId
    );
    const svg = original && sanitizePictogramSvg(original.svg);
    let approved = false;
    if (original && svg && original.approvedReadings.includes(layer.concept.trim().toLowerCase())) {
      try {
        const { originalArtworkPromotionService } = await import(
          "@/ai/puzzle-agent/review/original-artwork-promotion-server"
        );
        const record = await originalArtworkPromotionService.findEligible(original.assetId);
        approved = record?.assetId === original.assetId;
      } catch {
        // An unavailable review store never grants publication eligibility.
      }
    }
    if (!approved || !original || !svg) {
      result.issues.push(
        `Original artwork "${layer.concept}" is unavailable or lacks current approval for this reading`
      );
      result.visual.layers.push(layer);
      continue;
    }
    result.verifiedOriginalAssetIds.push(original.assetId);
    result.visual.layers.push({
      ...layer,
      svg,
      assetId: original.assetId,
      source: "approved-cache",
      emojiFallback: layer.emojiFallback || emojiFallbackFor(original.concept),
    });
  }
  result.visual.unicodeFallback = buildUnicodeFallback(result.visual.layers) || "◆";
  return result;
}
