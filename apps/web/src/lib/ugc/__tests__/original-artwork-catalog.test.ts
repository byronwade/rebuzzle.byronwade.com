const findEligible = jest.fn();
jest.mock("@/ai/puzzle-agent/review/original-artwork-promotion-server", () => ({
  originalArtworkPromotionService: { findEligible },
}));

import { listOriginalPictogramCandidates } from "@/ai/puzzle-agent/visual/original-pictograms";
import { listApprovedOriginalArtwork } from "../original-artwork-catalog";

beforeEach(() => jest.resetAllMocks());
it("lists only exact currently eligible originals with authored reading metadata", async () => {
  const clock = listOriginalPictogramCandidates()[0];
  findEligible.mockImplementation(async (id: string) =>
    id === clock.assetId ? { assetId: id } : null
  );
  const result = await listApprovedOriginalArtwork();
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({
    id: clock.assetId,
    concept: "clock",
    svg: clock.svg,
    canonicalConcept: "clock",
    approvedReadings: ["clock", "timepiece"],
    provenance: "authored-svg",
  });
  expect(result[0].approvedReadings).not.toContain("watch");
});
it("omits originals when approval cannot be verified", async () => {
  findEligible.mockRejectedValue(new Error("Unavailable"));
  await expect(listApprovedOriginalArtwork()).resolves.toEqual([]);
});
