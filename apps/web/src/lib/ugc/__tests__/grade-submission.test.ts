import { gradeUserPuzzleSubmission } from "../grade-submission";

jest.mock("@/ai/learning/answer-registry", () => ({
  normalizeAnswerKey: (answer: string) => answer.toLowerCase().replace(/[^a-z0-9]/g, ""),
  isAnswerRegistered: jest.fn(async () => ({ taken: false })),
}));

jest.mock("@/ai/puzzle-agent/visual/curated-pictograms", () => ({
  resolveCuratedPictogram: (concept: string) => {
    if (concept === "sun" || concept === "flower") {
      return {
        assetId: `id-${concept}`,
        canonicalConcept: concept,
        svg: `<svg data-concept="${concept}"></svg>`,
      };
    }
    return null;
  },
  isAuthenticCuratedPictogram: () => true,
}));

describe("gradeUserPuzzleSubmission", () => {
  it("passes a fair catalog compound board", async () => {
    const result = await gradeUserPuzzleSubmission({
      answer: "sunflower",
      explanation: "Sun pictogram plus flower pictogram reads as the compound sunflower.",
      hints: ["compound word", "starts with S", "a yellow garden plant"],
      techniqueId: "simple_compound",
      difficulty: 4,
      visual: {
        layout: "row",
        layers: [
          { kind: "pictogram", concept: "sun", emojiFallback: "SU" },
          { kind: "operator", symbol: "+" },
          { kind: "pictogram", concept: "flower", emojiFallback: "FL" },
        ],
      },
    });
    expect(result.ok).toBe(true);
    expect(result.visual.layers.filter((l) => l.kind === "pictogram")).toHaveLength(2);
    expect(result.issues).toEqual([]);
  });

  it("rejects answer leakage and thin explanations", async () => {
    const result = await gradeUserPuzzleSubmission({
      answer: "sunflower",
      explanation: "too short",
      hints: ["a", "b"],
      techniqueId: "simple_compound",
      difficulty: 4,
      visual: {
        layout: "row",
        layers: [{ kind: "text", content: "SUNFLOWER", emphasis: "normal" }],
      },
    });
    expect(result.ok).toBe(false);
    expect(result.issues.join(" ")).toMatch(/Explanation|hints|visible|pictogram/i);
  });
});
