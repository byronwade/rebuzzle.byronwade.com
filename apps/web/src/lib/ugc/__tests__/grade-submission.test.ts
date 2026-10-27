const findEligible = jest.fn();
jest.mock("@/ai/puzzle-agent/review/original-artwork-promotion-server", () => ({
  originalArtworkPromotionService: { findEligible },
}));

import { gradeUserPuzzleSubmission } from "../grade-submission";

jest.mock("@/ai/learning/answer-registry", () => ({
  normalizeAnswerKey: (answer: string) => answer.toLowerCase().replace(/[^a-z0-9]/g, ""),
  isAnswerRegistered: jest.fn(async () => ({ taken: false })),
}));

jest.mock("../submissions", () => ({
  isUgcAnswerKeyTaken: jest.fn(async () => false),
}));

jest.mock("@/ai/puzzle-agent/visual/curated-pictograms", () => {
  const actual = jest.requireActual(
    "@/ai/puzzle-agent/visual/curated-pictograms"
  ) as typeof import("@/ai/puzzle-agent/visual/curated-pictograms");
  return {
    ...actual,
    isAuthenticCuratedPictogram: () => true,
  };
});

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

it("grades selected original artwork and rejects the same board after approval is withdrawn", async () => {
  const input = {
    answer: "sunflower",
    explanation: "Sun pictogram plus flower pictogram reads as the compound sunflower.",
    hints: ["compound word", "starts with S", "a yellow garden plant"],
    techniqueId: "simple_compound",
    difficulty: 4,
    visual: {
      layout: "row" as const,
      layers: [
        {
          kind: "pictogram" as const,
          concept: "sun",
          assetId: "rebuzzle-ink:sun:v1",
          emojiFallback: "SU",
        },
        { kind: "operator" as const, symbol: "+" as const },
        {
          kind: "pictogram" as const,
          concept: "flower",
          assetId: "rebuzzle-ink:flower:v1",
          emojiFallback: "FL",
        },
      ],
    },
  };
  findEligible.mockImplementation(async (assetId: string) => ({ assetId }));
  const accepted = await gradeUserPuzzleSubmission(input);
  expect(accepted.issues).toEqual([]);
  expect(accepted.ok).toBe(true);
  expect(accepted.visual.layers[0]).toMatchObject({
    assetId: "rebuzzle-ink:sun:v1",
    source: "approved-cache",
  });
  findEligible.mockResolvedValue(null);
  const revoked = await gradeUserPuzzleSubmission(input);
  expect(revoked.ok).toBe(false);
  expect(revoked.issues.join(" ")).toMatch(/current approval/);
});
