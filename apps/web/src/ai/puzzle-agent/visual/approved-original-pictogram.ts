import { recognizePictogramIcon } from "./critique-pictogram";
import type { GeneratePictogramResult } from "./generate-pictogram";
import { listOriginalPictogramCandidates } from "./original-pictograms";
import { evaluatePictogramPixelIntegrity } from "./pictogram-pixel-integrity";
import { sanitizePictogramSvg } from "./sanitize-svg";

/** New compositions only; never rewrites a saved or published board. */
export async function generateApprovedOriginalPictogram(input: {
  concept: string;
  role?: string;
  emojiFallback: string;
}): Promise<GeneratePictogramResult | null> {
  const asset = listOriginalPictogramCandidates().find((candidate) =>
    candidate.approvedReadings.includes(input.concept.trim().toLowerCase())
  );
  if (!asset) return null;
  try {
    const { originalArtworkPromotionService } = await import(
      "../review/original-artwork-promotion-server"
    );
    const approval = await originalArtworkPromotionService.findEligible(asset.assetId);
    const svg = sanitizePictogramSvg(asset.svg);
    if (!approval || approval.assetId !== asset.assetId || !svg) return null;
    const pixelIntegrity = await evaluatePictogramPixelIntegrity(svg);
    if (!pixelIntegrity.ok) return null;
    const recognition = await recognizePictogramIcon({ svg, concept: input.concept });
    if (!recognition.ok) return null;
    return {
      ...input,
      styleId: asset.styleId,
      svg,
      ok: true,
      source: "approved-cache",
      assetId: asset.assetId,
      clarityScore: 90,
      clarityReasons: [],
      pixelIntegrity,
      attempts: 0,
      seenAs: recognition.seenLabel,
      recognitionConfidence: recognition.confidence,
      recognitionProfiles: recognition.profileResults?.map((profile) => ({
        tileSize: profile.tileSize,
        seenAs: profile.seenLabel,
        confidence: profile.confidence,
      })),
    };
  } catch {
    // Approval or recognition outages leave the existing reviewed catalog available.
    return null;
  }
}
