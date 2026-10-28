import type { PuzzleAgentResult } from "../schemas";
import { toStudioApexCandidate } from "../studio-drafts";

function result(techniqueId = "positional_phrase") {
  return {
    puzzle: {
      rebusPuzzle: "ONE over door",
      answer: "one way or another",
      difficulty: 7,
      difficultyLevel: "Evil",
      explanation: "The word one is placed above a door, showing one way.",
      category: "phrases",
      hints: ["Look at placement.", "Read the pieces together.", "It is a familiar phrase."],
      techniqueId,
      visual: {
        styleId: "ink-pictogram-v1",
        mode: "composed",
        layout: "stack",
        unicodeFallback: "ONE\ndoor",
        layers: [{ kind: "text", content: "ONE", emphasis: "large" }],
      },
    },
    metadata: {
      fingerprint: "private-fingerprint",
      uniquenessScore: 91,
      noveltyEvidence: { private: "research" },
      calibratedDifficulty: 7,
      qualityScore: 94,
      qualityVerdict: "good",
      funScore: 88,
      answerSeed: "private-seed",
      answerSeedCuePlan: [{ kind: "private", concept: "hidden" }],
      boardRecognitionConfidence: 0.9,
      boardRecognitionModels: ["private-model"],
      generationAttempts: 1,
      thinkingSummary: "private reasoning",
    },
    status: "success",
    recommendations: ["private recommendation"],
  } as unknown as PuzzleAgentResult;
}

describe("Studio candidate adapter", () => {
  it("maps a successful generation into the rendered qualification candidate", () => {
    const candidate = toStudioApexCandidate(result(), 2);

    expect(candidate.answer).toBe("one way or another");
    expect(candidate.techniqueId).toBe("positional_phrase");
    expect(candidate.visual.layout).toBe("stack");
    expect(candidate.qualityOverall).toBe(94);
    expect(candidate.publishable).toBe(true);
  });

  it("uses a known safe technique when the result names an unknown technique", () => {
    const candidate = toStudioApexCandidate(result("unknown-technique"), 1);

    expect(candidate.techniqueId).toBe("simple_compound");
  });

  it("uses an opaque slot ID rather than exposing the answer or fingerprint", () => {
    const candidate = toStudioApexCandidate(result(), 2);

    expect(candidate.id).toBe("studio-candidate-2");
    expect(candidate.id).not.toContain("one way or another");
    expect(candidate.id).not.toContain("private-fingerprint");
  });
});
