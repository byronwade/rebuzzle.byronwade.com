import { originalArtworkPromotionService } from "@/ai/puzzle-agent/review/original-artwork-promotion-server";
import { listOriginalPictogramCandidates } from "@/ai/puzzle-agent/visual/original-pictograms";
import { sanitizePictogramSvg } from "@/ai/puzzle-agent/visual/sanitize-svg";

/** Selection metadata only; grading and publication independently recheck approval. */
export async function listApprovedOriginalArtwork() {
  const rows = await Promise.all(
    listOriginalPictogramCandidates().map(async (asset) => {
      try {
        const approved = await originalArtworkPromotionService.findEligible(asset.assetId);
        const svg = sanitizePictogramSvg(asset.svg);
        if (!approved || approved.assetId !== asset.assetId || !svg) return null;
        return {
          id: asset.assetId,
          concept: asset.concept,
          canonicalConcept: asset.concept,
          svg,
          approvedReadings: [...asset.approvedReadings],
          searchAliases: [...asset.searchAliases],
          commonConfusions: [...asset.commonConfusions],
          readingPolicyVersion: asset.readingPolicyVersion,
          provenance: asset.provenance,
        };
      } catch {
        return null;
      }
    })
  );
  return rows.filter((row): row is NonNullable<typeof row> => row !== null);
}
