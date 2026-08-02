const generateAIObject = jest.fn();

jest.mock("../../../client", () => ({ generateAIObject }));

import { critiqueCandidate } from "../critique";

const input = {
  rebusPuzzle: "key over key",
  answer: "keynote",
  explanation: "A positional phrase.",
  hints: ["Look at the layout."],
  techniqueId: "positional_phrase",
  difficulty: 5,
  tierLabel: "Hard",
  unicodeFallback: "key\nkey",
  pictogramConcepts: ["key"],
};

const modelResponse = {
  verdict: "ship" as const,
  summary: "Clear and fair",
  strengths: ["Concrete cue"],
  flaws: [],
  reviseInstructions: [],
  falseLeadQuality: 85,
  ahaPredicted: 84,
  creativityScore: 80,
  iconRecognizability: 90,
  overusedTrope: false,
};

describe("critique source tracking", () => {
  beforeEach(() => jest.clearAllMocks());

  it("marks a successful model critique as actionable model evidence", async () => {
    generateAIObject.mockResolvedValue(modelResponse);

    await expect(critiqueCandidate(input)).resolves.toMatchObject({
      source: "model",
      verdict: "ship",
    });
  });

  it("marks an unavailable critique as fallback evidence", async () => {
    generateAIObject.mockRejectedValue(new Error("provider unavailable"));

    await expect(critiqueCandidate(input)).resolves.toMatchObject({
      source: "fallback",
      verdict: "revise",
    });
  });
});
