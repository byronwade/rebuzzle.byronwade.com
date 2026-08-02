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
