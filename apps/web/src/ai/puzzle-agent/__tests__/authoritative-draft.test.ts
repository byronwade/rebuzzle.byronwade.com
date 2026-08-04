import {
  answerSeedStructureIssues,
  applyAuthoritativeComposition,
  mergeInventAssetsOntoPreflight,
} from "../authoritative-draft";
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

const preflightBoard = {
  answer: "keyboard",
  visual: {
    styleId: "ink-pictogram-v1" as const,
    mode: "composed" as const,
    layout: "row" as const,
    unicodeFallback: "🔑 + BOARD",
    layers: [
      {
        kind: "pictogram" as const,
        concept: "key",
        emojiFallback: "🔑",
        svg: "<svg id='preflight' />",
        assetId: "key",
        source: "catalog" as const,
      },
      { kind: "operator" as const, symbol: "+" },
      { kind: "text" as const, content: "BOARD", emphasis: "normal" as const },
    ],
  },
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

describe("answer-seed structure lock", () => {
  it("detects layout and layer drift", () => {
    expect(
      answerSeedStructureIssues(preflightBoard.visual, {
        ...preflightBoard.visual,
        layout: "stack",
      })
    ).toEqual(expect.arrayContaining([expect.stringMatching(/Layout drifted/i)]));

    expect(
      answerSeedStructureIssues(preflightBoard.visual, {
        ...preflightBoard.visual,
        layers: preflightBoard.visual.layers.slice(0, 1),
      })
    ).toEqual(expect.arrayContaining([expect.stringMatching(/Layer count drifted/i)]));
  });

  it("keeps host structure and merges invent asset fills", () => {
    const invent = {
      answer: "keyboard",
      visual: {
        ...preflightBoard.visual,
        layers: [
          {
            kind: "pictogram" as const,
            concept: "key",
            emojiFallback: "🔑",
            svg: "<svg id='invent' />",
            assetId: "key",
            source: "catalog" as const,
            seenAs: ["key"],
            recognitionConfidence: 0.95,
          },
          { kind: "operator" as const, symbol: "+" },
          { kind: "text" as const, content: "BOARD", emphasis: "normal" as const },
        ],
      },
    };

    const merged = mergeInventAssetsOntoPreflight(preflightBoard, invent);
    expect(merged.visual.layout).toBe("row");
    expect(merged.visual.layers).toHaveLength(3);
    expect(merged.visual.layers[0]).toEqual(
      expect.objectContaining({
        kind: "pictogram",
        svg: "<svg id='invent' />",
        seenAs: ["key"],
        recognitionConfidence: 0.95,
      })
    );
  });

  it("discards invent boards that restructure the preflight", () => {
    const invent = {
      answer: "keyboard",
      visual: {
        ...preflightBoard.visual,
        layout: "stack" as const,
        layers: [
          {
            kind: "pictogram" as const,
            concept: "key",
            emojiFallback: "🔑",
            svg: "<svg id='invent' />",
            source: "catalog" as const,
          },
        ],
      },
    };

    const merged = mergeInventAssetsOntoPreflight(preflightBoard, invent);
    expect(merged).toEqual(preflightBoard);
  });
});
