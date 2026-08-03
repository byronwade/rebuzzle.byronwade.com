import { INK_PICTOGRAM_PALETTE } from "@/ai/puzzle-agent/visual/style";
import type { PuzzleVisual } from "@/lib/gameSettings";
import {
  contrastRatio,
  extractSvgColors,
  relativeLuminance,
  resolvePuzzleSurface,
} from "@/lib/puzzle-surface";

function visual(layers: PuzzleVisual["layers"]): PuzzleVisual {
  return {
    styleId: "ink-pictogram-v1",
    mode: "composed",
    layout: "row",
    layers,
  };
}

describe("puzzle-surface", () => {
  it("uses cinema for unicode / empty boards", () => {
    expect(resolvePuzzleSurface(undefined).mode).toBe("cinema");
    expect(
      resolvePuzzleSurface({
        styleId: "ink-pictogram-v1",
        mode: "unicode",
        layout: "row",
        layers: [],
      }).mode
    ).toBe("cinema");
  });

  it("uses paper for standard ink-palette pictograms", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="20" fill="${INK_PICTOGRAM_PALETTE.canvas}" stroke="${INK_PICTOGRAM_PALETTE.ink}" stroke-width="2"/><path d="M20 40h24" stroke="${INK_PICTOGRAM_PALETTE.mist}"/></svg>`;
    const surface = resolvePuzzleSurface(
      visual([{ kind: "pictogram", concept: "cloud", svg, emojiFallback: "☁️" }])
    );
    expect(surface.mode).toBe("paper");
    expect(surface.usesMeaningColors).toBe(false);
    expect(surface.canvas).toBe(INK_PICTOGRAM_PALETTE.canvas);
  });

  it("keeps paper for accent/strike palette accents", () => {
    const svg = `<svg viewBox="0 0 64 64"><circle fill="${INK_PICTOGRAM_PALETTE.accent}" stroke="${INK_PICTOGRAM_PALETTE.strike}" cx="32" cy="32" r="10"/></svg>`;
    const surface = resolvePuzzleSurface(
      visual([{ kind: "pictogram", concept: "dot", svg, emojiFallback: "•" }])
    );
    expect(surface.mode).toBe("paper");
    expect(surface.usesMeaningColors).toBe(false);
  });

  it("flips to cinema when meaning colors are light-on-dark friendly", () => {
    const svg = `<svg viewBox="0 0 64 64"><circle fill="#ffe566" stroke="#fff8c4" cx="32" cy="32" r="18"/></svg>`;
    const surface = resolvePuzzleSurface(
      visual([{ kind: "pictogram", concept: "sun", svg, emojiFallback: "☀️" }])
    );
    expect(surface.usesMeaningColors).toBe(true);
    expect(surface.mode).toBe("cinema");
  });

  it("stays on paper when meaning colors are dark paints", () => {
    const svg = `<svg viewBox="0 0 64 64"><rect fill="#1e3a8a" stroke="#0f172a" width="40" height="40" x="12" y="12"/></svg>`;
    const surface = resolvePuzzleSurface(
      visual([{ kind: "pictogram", concept: "block", svg, emojiFallback: "🟦" }])
    );
    expect(surface.usesMeaningColors).toBe(true);
    expect(surface.mode).toBe("paper");
  });

  it("extracts hex colors from SVG", () => {
    expect(extractSvgColors(`<path fill="#Abc" stroke="#112233"/>`)).toEqual(
      expect.arrayContaining(["#aabbcc", "#112233"])
    );
  });

  it("computes WCAG contrast", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 2);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 2);
    expect(contrastRatio("#1a1f1c", "#f4f6f3")).toBeGreaterThan(10);
  });
});
