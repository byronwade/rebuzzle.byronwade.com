import { applyAuthoritativeComposition } from "../authoritative-draft";
import { resolveCuratedPictogram } from "../visual/curated-pictograms";

const eye = resolveCuratedPictogram("eye")!;
const visual = {
  styleId: "ink-pictogram-v1" as const,
  mode: "composed" as const,
  layout: "row" as const,
  unicodeFallback: "👁️ + SCREAM",
  layers: [
    {
      kind: "pictogram" as const,
      concept: "eye",
      emojiFallback: "👁️",
      svg: eye.svg,
      assetId: eye.assetId,
      source: "catalog" as const,
    },
  ],
};

const puzzle = {
  rebusPuzzle: "model-authored-copy",
  answer: "Ice Cream",
  difficulty: 5,
  difficultyLevel: "Hard" as const,
  explanation: "The eye contributes the I sound before the sound of a scream.",
  category: "phonetic",
  hints: ["Listen.", "Start with the icon.", "Say both parts aloud."],
  techniqueId: "single_homophone",
  visual: { ...visual, layers: [{ ...visual.layers[0], source: undefined, svg: undefined }] },
};

describe("applyAuthoritativeComposition", () => {
  it("replaces the model copy with exact tool-owned visual provenance", () => {
    expect(
      applyAuthoritativeComposition(puzzle, { answer: "ice cream", visual }).visual.layers[0]
    ).toEqual(visual.layers[0]);
  });

  it("rejects an answer changed after composition", () => {
    expect(() =>
      applyAuthoritativeComposition(
        { ...puzzle, answer: "eye scream" },
        { answer: "ice cream", visual }
      )
    ).toThrow("Final answer changed");
  });
});
