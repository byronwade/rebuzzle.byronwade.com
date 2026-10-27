const findEligible = jest.fn();
jest.mock("@/ai/puzzle-agent/review/original-artwork-promotion-server", () => ({
  originalArtworkPromotionService: { findEligible },
}));

import { resolveCuratedPictogram } from "@/ai/puzzle-agent/visual/curated-pictograms";
import { listOriginalPictogramCandidates } from "@/ai/puzzle-agent/visual/original-pictograms";
import { hydrateStudioVisualWithApprovals } from "../visual-hydrate";

const clock = listOriginalPictogramCandidates()[0];
const layer = {
  kind: "pictogram" as const,
  concept: "timepiece",
  assetId: clock.assetId,
  svg: "untrusted client bytes",
  emojiFallback: "clock",
  x: 25,
  y: 50,
};
beforeEach(() => {
  jest.resetAllMocks();
});
it("hydrates an approved exact original without replacing its supported reading or placement", async () => {
  findEligible.mockResolvedValue({ assetId: clock.assetId });
  const result = await hydrateStudioVisualWithApprovals({ layers: [layer] });
  expect(result.issues).toEqual([]);
  expect(result.visual.layers[0]).toMatchObject({
    ...layer,
    svg: clock.svg,
    source: "approved-cache",
  });
});
it.each([null, new Error("Review store unavailable")])(
  "rejects missing or unavailable original approval",
  async (approval) => {
    if (approval instanceof Error) findEligible.mockRejectedValue(approval);
    else findEligible.mockResolvedValue(approval);
    const result = await hydrateStudioVisualWithApprovals({ layers: [layer] });
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.visual.layers[0]).toMatchObject({ assetId: clock.assetId });
  }
);
it.each([{ concept: "watch" }, { assetId: "rebuzzle-ink:clock:v999" }])(
  "rejects confusion readings or unknown versions",
  async (change) => {
    findEligible.mockResolvedValue({ assetId: clock.assetId });
    const result = await hydrateStudioVisualWithApprovals({ layers: [{ ...layer, ...change }] });
    expect(result.issues.length).toBeGreaterThan(0);
  }
);
it("preserves legacy artwork and layer order on mixed boards", async () => {
  findEligible.mockResolvedValue({ assetId: clock.assetId });
  const legacy = resolveCuratedPictogram("clock")!;
  const result = await hydrateStudioVisualWithApprovals({
    layers: [
      { ...layer, concept: "clock", assetId: legacy.assetId },
      { kind: "text", content: "WORK", emphasis: "normal" },
      layer,
    ],
  });
  expect(result.issues).toEqual([]);
  expect(result.visual.layers.map((l) => l.kind)).toEqual(["pictogram", "text", "pictogram"]);
  expect(result.visual.layers[0]).toMatchObject({
    assetId: legacy.assetId,
    svg: legacy.svg,
    source: "catalog",
  });
  expect(findEligible).toHaveBeenCalledTimes(1);
});
