const findEligible = jest.fn();
jest.mock("../../review/original-artwork-promotion-server", () => ({
  originalArtworkPromotionService: { findEligible },
}));

import { listOriginalPictogramCandidates } from "../original-pictograms";
import { sanitizePictogramSvg } from "../sanitize-svg";

const findApproved = jest.fn();

jest.mock("../../review/generated-pictogram-registry-server", () => ({
  generatedPictogramRegistry: { findApproved },
}));

import { resolveCuratedPictogram } from "../curated-pictograms";
import { verifyPublicationAssets } from "../publication-assets";

const eye = resolveCuratedPictogram("eye")!;

describe("verifyPublicationAssets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("accepts an exact curated catalog asset without loading the registry", async () => {
    await expect(
      verifyPublicationAssets({
        styleId: "ink-pictogram-v1",
        mode: "composed",
        layout: "row",
        unicodeFallback: "👁️",
        layers: [
          {
            kind: "pictogram",
            concept: "eye",
            emojiFallback: "👁️",
            svg: eye.svg,
            source: "catalog",
            assetId: eye.assetId,
          },
        ],
      })
    ).resolves.toEqual({ ok: true });
    expect(findApproved).not.toHaveBeenCalled();
  });

  it("rejects a freshly generated or unproven player-facing SVG", async () => {
    const result = await verifyPublicationAssets({
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "row",
      unicodeFallback: "◆",
      layers: [
        {
          kind: "pictogram",
          concept: "lighthouse",
          emojiFallback: "🔦",
          svg: eye.svg,
          source: "generated",
        },
      ],
    });

    expect(result).toMatchObject({ ok: false, concept: "lighthouse" });
    expect(findApproved).not.toHaveBeenCalled();
  });

  it("accepts only the exact current human-approved registry asset", async () => {
    findApproved.mockResolvedValue({
      id: "generated-pictogram:approved",
      svg: eye.svg,
    });
    const visual = {
      styleId: "ink-pictogram-v1" as const,
      mode: "composed" as const,
      layout: "row" as const,
      unicodeFallback: "🔦",
      layers: [
        {
          kind: "pictogram" as const,
          concept: "lighthouse",
          emojiFallback: "🔦",
          svg: eye.svg,
          source: "approved-cache" as const,
          assetId: "generated-pictogram:approved",
        },
      ],
    };

    await expect(verifyPublicationAssets(visual)).resolves.toEqual({ ok: true });
    await expect(
      verifyPublicationAssets({
        ...visual,
        layers: [{ ...visual.layers[0], assetId: "generated-pictogram:spoofed" }],
      })
    ).resolves.toMatchObject({ ok: false });
  });
});

describe("original artwork publication", () => {
  const asset = listOriginalPictogramCandidates()[0];
  const visual = {
    styleId: asset.styleId,
    mode: "composed" as const,
    layout: "row" as const,
    unicodeFallback: "clock",
    layers: [
      {
        kind: "pictogram" as const,
        concept: asset.concept,
        emojiFallback: "clock",
        assetId: asset.assetId,
        svg: sanitizePictogramSvg(asset.svg)!,
        source: "approved-cache" as const,
      },
    ],
  };
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it("accepts exact original artwork with current approval and an approved reading", async () => {
    findEligible.mockResolvedValue({ assetId: asset.assetId });
    await expect(verifyPublicationAssets(visual)).resolves.toEqual({ ok: true });
    expect(findApproved).not.toHaveBeenCalled();
  });
  it("rechecks approval and rejects a subsequently quarantined drawing", async () => {
    findEligible.mockResolvedValueOnce({ assetId: asset.assetId }).mockResolvedValueOnce(null);
    await expect(verifyPublicationAssets(visual)).resolves.toEqual({ ok: true });
    await expect(verifyPublicationAssets(visual)).resolves.toMatchObject({ ok: false });
  });
  it.each([
    { concept: "watch" },
    { svg: eye.svg },
    { assetId: "rebuzzle-ink:clock:v999" },
    { source: "catalog" as const },
  ])("rejects original identity or reading changes: %j", async (change) => {
    findEligible.mockResolvedValue({ assetId: asset.assetId });
    await expect(
      verifyPublicationAssets({ ...visual, layers: [{ ...visual.layers[0], ...change }] })
    ).resolves.toMatchObject({ ok: false });
  });
  it("fails closed when original approval cannot be checked", async () => {
    findEligible.mockRejectedValue(new Error("Database unavailable"));
    await expect(verifyPublicationAssets(visual)).resolves.toMatchObject({ ok: false });
  });
});
