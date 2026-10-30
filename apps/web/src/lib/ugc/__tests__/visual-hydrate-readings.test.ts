import * as catalog from "@/ai/puzzle-agent/visual/curated-pictograms";
import { hydrateStudioVisual } from "../visual-hydrate";

it("refuses to silently replace an explicitly selected asset", () => {
  const result = hydrateStudioVisual({
    layers: [
      { kind: "pictogram", concept: "apple", assetId: "lucide:citrus:v2", emojiFallback: "◆" },
    ],
  });
  expect(result.issues.length).toBeGreaterThan(0);
});

it("keeps the creator's supported reading while filling authoritative artwork", () => {
  const result = hydrateStudioVisual({
    layers: [{ kind: "pictogram", concept: "bike", emojiFallback: "◆" }],
  });
  expect(result.issues).toEqual([]);
  expect(result.visual.layers[0]).toMatchObject({ concept: "bike", assetId: "lucide:bicycle:v2" });
});

it("rejects a citrus search alias as a requested puzzle reading", () => {
  const result = hydrateStudioVisual({
    layers: [
      { kind: "pictogram", concept: "lemon", assetId: "lucide:citrus:v2", emojiFallback: "◆" },
    ],
  });
  expect(result.issues.length).toBeGreaterThan(0);
});

it("preserves the expanded free-canvas height while hydrating a Studio board", () => {
  const result = hydrateStudioVisual({
    layout: "free",
    freeCanvasHeight: 8_000,
    layers: [{ kind: "text", content: "UP", emphasis: "normal", x: 50, y: 50 }],
  });

  expect(result.visual).toMatchObject({ layout: "free", freeCanvasHeight: 8_000 });
});

it("preserves an explicit legacy identity independently of the current concept default", () => {
  const original = catalog.resolveCuratedPictogram("clock")!;
  const changedDefault = jest.spyOn(catalog, "resolveCuratedPictogram").mockReturnValue({
    ...original,
    assetId: "rebuzzle-ink:clock:v99",
    svg: "future default bytes",
  });
  try {
    const result = hydrateStudioVisual({
      layers: [
        { kind: "pictogram", concept: "clock", assetId: original.assetId, emojiFallback: "◆" },
      ],
    });
    expect(result.issues).toEqual([]);
    expect(result.visual.layers[0]).toMatchObject({ assetId: original.assetId, svg: original.svg });
  } finally {
    changedDefault.mockRestore();
  }
});

it.each(["lucide:clock:v999", "rebuzzle-ink:clock:v1", "lucide:cloud:v2"])(
  "does not hydrate an unknown or unapproved version %s",
  (assetId) => {
    expect(
      hydrateStudioVisual({
        layers: [{ kind: "pictogram", concept: "clock", assetId, emojiFallback: "◆" }],
      }).issues.length
    ).toBeGreaterThan(0);
  }
);
