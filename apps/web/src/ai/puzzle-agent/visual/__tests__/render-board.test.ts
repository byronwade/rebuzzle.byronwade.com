import sharp from "sharp";
import type { PuzzleVisual } from "../composition";
import { resolveCuratedPictogram } from "../curated-pictograms";
import { renderPuzzleVisual, renderPuzzleVisualProfiles } from "../render-board";

describe("renderPuzzleVisual", () => {
  it("renders the visual DSL to a readable PNG canvas", async () => {
    const car = resolveCuratedPictogram("car");
    const key = resolveCuratedPictogram("key");
    expect(car).not.toBeNull();
    expect(key).not.toBeNull();

    const visual: PuzzleVisual = {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "row",
      unicodeFallback: "🚗 + 🔑",
      layers: [
        { kind: "pictogram", concept: "car", emojiFallback: "🚗", svg: car!.svg },
        { kind: "operator", symbol: "+" },
        { kind: "pictogram", concept: "key", emojiFallback: "🔑", svg: key!.svg },
      ],
    };

    const png = await renderPuzzleVisual(visual);
    const metadata = await sharp(png).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(375);
    expect(metadata.height).toBeGreaterThanOrEqual(72);
  });

  it("renders all production profiles and preserves responsive wrapping", async () => {
    const icon = resolveCuratedPictogram("car")!;
    const visual: PuzzleVisual = {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "row",
      unicodeFallback: "🚗 + 🚗 + 🚗 + 🚗",
      layers: Array.from({ length: 7 }, (_, index) =>
        index % 2 === 0
          ? ({
              kind: "pictogram" as const,
              concept: "car",
              emojiFallback: "🚗",
              svg: icon.svg,
            } as const)
          : ({ kind: "operator" as const, symbol: "+" } as const)
      ),
    };

    const profiles = await renderPuzzleVisualProfiles(visual);
    expect(profiles.map((profile) => profile.profileId)).toEqual([
      "compact-320",
      "mobile-375",
      "desktop-768",
    ]);
    expect(profiles.map((profile) => profile.width)).toEqual([320, 375, 768]);
    expect(profiles[0]!.tileSize).toBe(44);
    expect(profiles[1]!.tileSize).toBe(72);
    expect(profiles[1]!.wrappedRows).toBeGreaterThan(profiles[2]!.wrappedRows);
  });
});
