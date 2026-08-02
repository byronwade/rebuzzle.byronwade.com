import type { PuzzleVisual } from "./composition";
import { isAuthenticCuratedPictogram } from "./curated-pictograms";

export type PublicationAssetCheck = { ok: true } | { ok: false; reason: string; concept?: string };

/**
 * Verify the actual assets returned by the model, not merely its declared
 * provenance. Player-facing pictograms must be exact catalog assets or exact
 * human-approved registry assets. Fresh generated SVGs remain review-only.
 */
export async function verifyPublicationAssets(
  visual: PuzzleVisual
): Promise<PublicationAssetCheck> {
  for (const layer of visual.layers) {
    if (layer.kind !== "pictogram") continue;
    if (!layer.svg) {
      return {
        ok: false,
        concept: layer.concept,
        reason: `Pictogram "${layer.concept}" has no approved SVG asset`,
      };
    }
    if (
      layer.source === "catalog" &&
      isAuthenticCuratedPictogram({
        concept: layer.concept,
        assetId: layer.assetId,
        svg: layer.svg,
      })
    ) {
      continue;
    }
    if (layer.source !== "approved-cache" || !layer.assetId) {
      return {
        ok: false,
        concept: layer.concept,
        reason: `Pictogram "${layer.concept}" is not catalog-backed or human-approved`,
      };
    }

    try {
      const { generatedPictogramRegistry } = await import(
        "../review/generated-pictogram-registry-server"
      );
      const approved = await generatedPictogramRegistry.findApproved(layer.concept);
      if (!approved || approved.id !== layer.assetId || approved.svg !== layer.svg) {
        return {
          ok: false,
          concept: layer.concept,
          reason: `Pictogram "${layer.concept}" does not match its approved registry asset`,
        };
      }
    } catch {
      return {
        ok: false,
        concept: layer.concept,
        reason: `Could not verify human approval for pictogram "${layer.concept}"`,
      };
    }
  }
  return { ok: true };
}
