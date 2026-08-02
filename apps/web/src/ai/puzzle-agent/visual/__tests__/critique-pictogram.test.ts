import {
  evaluateRecognitionConsensus,
  evaluateRecognitionProfiles,
} from "../recognition-consensus";

function judgment(model: string, seenLabel: string, confidence: number, isAmbiguous = false) {
  return {
    model,
    seenLabel,
    confidence,
    isAmbiguous,
    alternateReadings: [],
    redrawAdvice: "Use a clearer silhouette",
  };
}

describe("rendered pictogram recognition consensus", () => {
  it("accepts a car only when two blind judges recognize it", () => {
    const result = evaluateRecognitionConsensus({
      concept: "car",
      judgments: [judgment("vision-a", "car", 0.94), judgment("vision-b", "automobile", 0.87)],
      minConfidence: 0.68,
      requiredVotes: 2,
    });

    expect(result.ok).toBe(true);
    expect(result.judges.every((judge) => judge.passed)).toBe(true);
    expect(result.confidence).toBe(0.87);
  });

  it("rejects a structurally valid drawing when judges see the wrong object", () => {
    const result = evaluateRecognitionConsensus({
      concept: "car",
      judgments: [judgment("vision-a", "shoe", 0.91), judgment("vision-b", "unclear", 0.42, true)],
      minConfidence: 0.68,
      requiredVotes: 2,
    });

    expect(result.ok).toBe(false);
    expect(result.matchesConcept).toBe(false);
  });

  it("fails closed when an independent judge is unavailable", () => {
    const result = evaluateRecognitionConsensus({
      concept: "car",
      judgments: [judgment("vision-a", "car", 0.95)],
      minConfidence: 0.68,
      requiredVotes: 2,
    });

    expect(result.ok).toBe(false);
    expect(result.isAmbiguous).toBe(true);
  });

  it("does not count duplicate responses from one model as independent votes", () => {
    const result = evaluateRecognitionConsensus({
      concept: "car",
      judgments: [judgment("vision-a", "car", 0.95), judgment("vision-a", "car", 0.94)],
      minConfidence: 0.68,
      requiredVotes: 2,
    });

    expect(result.ok).toBe(false);
    expect(result.judges).toHaveLength(1);
  });

  it("rejects low-confidence matches", () => {
    const result = evaluateRecognitionConsensus({
      concept: "car",
      judgments: [judgment("vision-a", "car", 0.55), judgment("vision-b", "automobile", 0.64)],
      minConfidence: 0.68,
      requiredVotes: 2,
    });

    expect(result.ok).toBe(false);
  });

  it("rejects an icon that works at 72px but fails at compact 36px", () => {
    const large = evaluateRecognitionConsensus({
      concept: "car",
      judgments: [judgment("vision-a", "car", 0.94), judgment("vision-b", "car", 0.9)],
      minConfidence: 0.68,
      requiredVotes: 2,
    });
    const compact = evaluateRecognitionConsensus({
      concept: "car",
      judgments: [judgment("vision-a", "shoe", 0.8), judgment("vision-b", "unclear", 0.3, true)],
      minConfidence: 0.68,
      requiredVotes: 2,
    });
    const result = evaluateRecognitionProfiles({
      profileResults: [
        { ...compact, tileSize: 36 },
        { ...large, tileSize: 72 },
      ],
      expectedTileSizes: [36, 72],
    });

    expect(result.ok).toBe(false);
    expect(result.redrawAdvice).toContain("36px");
  });

  it("fails closed when a required player size was not tested", () => {
    const large = evaluateRecognitionConsensus({
      concept: "car",
      judgments: [judgment("vision-a", "car", 0.94), judgment("vision-b", "car", 0.9)],
      minConfidence: 0.68,
      requiredVotes: 2,
    });
    const result = evaluateRecognitionProfiles({
      profileResults: [{ ...large, tileSize: 72 }],
      expectedTileSizes: [36, 72],
    });

    expect(result.ok).toBe(false);
    expect(result.redrawAdvice).toContain("Missing tests at 36px");
  });
});
