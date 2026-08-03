jest.mock("../../visual/compose-visual", () => ({
  composePuzzleVisual: jest.fn(async ({ layers }: { layers: unknown[] }) => ({
    visual: {
      styleId: "ink-pictogram-v1",
      mode: "composed",
      layout: "row",
      layers,
      unicodeFallback: "🌸 POT",
    },
    totalParts: layers.length,
    withinBudget: true,
    componentBudget: { min: 1, max: 4 },
    funScore: 80,
    issues: [],
    tips: [],
    generated: { pictograms: 1, images: 0, failedPictograms: 0, failedImages: 0 },
  })),
}));

import { resolveCuratedPictogram } from "../../visual/curated-pictograms";
import {
  inspectAnswerSeedCuePlan,
  layersFromAnswerSeedCues,
  preflightComposeAnswerSeedCuePlan,
} from "../cue-plan-preflight";

describe("cue-plan preflight", () => {
  it("builds deterministic layers from host-owned cues", () => {
    const layers = layersFromAnswerSeedCues([
      { kind: "catalog", concept: "flower", role: "word-part" },
      { kind: "text", content: "POT", role: "word-part" },
      { kind: "operator", symbol: "+", role: "structural-anchor" },
    ]);

    expect(layers).toEqual([
      expect.objectContaining({
        kind: "pictogram",
        concept: "flower",
        source: "catalog",
        assetId: expect.stringContaining("lucide:flower"),
        svg: expect.stringContaining("<svg"),
      }),
      { kind: "text", content: "POT", emphasis: "normal" },
      { kind: "operator", symbol: "+" },
    ]);
    expect(resolveCuratedPictogram("flower")).not.toBeNull();
  });

  it("inspects cue plans and rejects quarantined catalog concepts", () => {
    const inspection = inspectAnswerSeedCuePlan({
      cues: [
        { kind: "catalog", concept: "flower", role: "word-part" },
        { kind: "catalog", concept: "box", role: "word-part" },
      ],
    });

    expect(inspection.ready).toBe(false);
    expect(inspection.issues).toEqual([
      "Answer-seed cue is not an approved catalog concept: box",
    ]);
  });

  it("composes a catalog-backed board without invent when cues are valid", async () => {
    const result = await preflightComposeAnswerSeedCuePlan({
      answer: "flower pot",
      targetDifficulty: 5,
      techniqueId: "simple_compound",
      cues: [
        { kind: "catalog", concept: "flower", role: "word-part" },
        { kind: "text", content: "POT", role: "word-part" },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.composition?.issues).toEqual([]);
    expect(result.composition?.visual.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "pictogram", concept: "flower" }),
        expect.objectContaining({ kind: "text", content: "POT" }),
      ])
    );
    expect(result.inspection.ready).toBe(true);
  });

  it("fails closed before compose when the cue plan is invalid", async () => {
    const result = await preflightComposeAnswerSeedCuePlan({
      answer: "mystery box",
      targetDifficulty: 5,
      cues: [{ kind: "catalog", concept: "box", role: "word-part" }],
    });

    expect(result.ok).toBe(false);
    expect(result.stage).toBe("cue-plan");
    expect(result.composition).toBeNull();
  });
});
