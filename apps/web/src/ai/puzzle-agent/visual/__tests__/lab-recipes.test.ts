import { buildLabLayers, guessEmoji, isVisualLabMode, VISUAL_LAB_MODES } from "../lab-recipes";

describe("visual lab recipes", () => {
  it("recognizes all lab modes", () => {
    for (const mode of VISUAL_LAB_MODES) {
      expect(isVisualLabMode(mode)).toBe(true);
    }
    expect(isVisualLabMode("nope")).toBe(false);
  });

  it("builds text layers with emphasis devices", () => {
    const plan = buildLabLayers("text", { concept: "bee", answer: "headline" });
    expect(plan.layers.some((l) => l.kind === "text" && l.emphasis === "stacked")).toBe(true);
    expect(plan.layers.some((l) => l.kind === "operator")).toBe(true);
  });

  it("builds composed pictogram layers", () => {
    const plan = buildLabLayers("composed", { concept: "bee", answer: "before" });
    const pictograms = plan.layers.filter((l) => l.kind === "pictogram");
    expect(pictograms.length).toBeGreaterThanOrEqual(2);
    expect(guessEmoji("bee")).toBe("🐝");
  });

  it("builds hybrid with an image layer", () => {
    const plan = buildLabLayers("hybrid", { concept: "sun", answer: "sunshine" });
    expect(plan.layers.some((l) => l.kind === "image")).toBe(true);
    expect(plan.layers.some((l) => l.kind === "pictogram")).toBe(true);
  });
});
