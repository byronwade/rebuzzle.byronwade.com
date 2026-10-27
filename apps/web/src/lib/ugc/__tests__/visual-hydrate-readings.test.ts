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
