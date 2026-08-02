import { summarizeBlindSolveAttempts } from "../blind-solve-consensus";

describe("blind screenshot solve consensus", () => {
  it("derives solve rate only from answer hypotheses", () => {
    const summary = summarizeBlindSolveAttempts({
      answer: "car key",
      attempts: [
        {
          model: "vision-a",
          visibleElements: ["car", "key"],
          relationships: ["car plus key"],
          hypotheses: [
            { answer: "car key", confidence: 0.9, rationale: "car plus key" },
            { answer: "turn key", confidence: 0.3, rationale: "a key near a car" },
          ],
          confidence: 0.9,
        },
        {
          model: "vision-b",
          visibleElements: ["automobile", "key"],
          relationships: ["two adjacent objects"],
          hypotheses: [{ answer: "car key", confidence: 0.8, rationale: "literal compound" }],
          confidence: 0.85,
        },
      ],
    });

    expect(summary.targetFoundBy).toBe(2);
    expect(summary.topTargetFoundBy).toBe(2);
    expect(summary.dominantTargetFoundBy).toBe(2);
    expect(summary.estimatedSolveRate).toBeCloseTo(0.85);
    expect(summary.meanReciprocalRank).toBe(1);
    expect(summary.wrongParses).toEqual(["turn key"]);
  });

  it("does not award solve credit when judges only inventory the right objects", () => {
    const summary = summarizeBlindSolveAttempts({
      answer: "car key",
      attempts: [
        {
          model: "vision-a",
          visibleElements: ["car", "key"],
          relationships: ["car plus key"],
          hypotheses: [{ answer: "turn key", confidence: 0.7, rationale: "key beside car" }],
          confidence: 0.8,
        },
      ],
    });

    expect(summary.targetFoundBy).toBe(0);
    expect(summary.topTargetFoundBy).toBe(0);
    expect(summary.estimatedSolveRate).toBe(0);
  });

  it("does not treat a lower-ranked answer mention as a successful solve", () => {
    const summary = summarizeBlindSolveAttempts({
      answer: "car key",
      attempts: [
        {
          model: "vision-a",
          profileId: "compact-320",
          visibleElements: ["car", "key"],
          relationships: ["key beside car"],
          hypotheses: [
            { answer: "turn key", confidence: 0.92, rationale: "stronger literal reading" },
            { answer: "car key", confidence: 0.7, rationale: "possible compound" },
          ],
          confidence: 0.9,
        },
      ],
    });

    expect(summary.targetFoundBy).toBe(1);
    expect(summary.topTargetFoundBy).toBe(0);
    expect(summary.dominantTargetFoundBy).toBe(0);
    expect(summary.estimatedSolveRate).toBe(0);
    expect(summary.meanReciprocalRank).toBe(0.5);
    expect(summary.profilesWithTarget).toBe(0);
    expect(summary.profilesWithTopTarget).toBe(0);
    expect(summary.strongestWrongConfidence).toBe(0.92);
  });

  it("requires independent agreement within each responsive profile", () => {
    const summary = summarizeBlindSolveAttempts({
      answer: "car key",
      attempts: [
        {
          model: "vision-a",
          profileId: "mobile-375",
          visibleElements: ["car", "key"],
          relationships: ["car plus key"],
          hypotheses: [{ answer: "car key", confidence: 0.9, rationale: "literal compound" }],
          confidence: 0.9,
        },
        {
          model: "vision-b",
          profileId: "mobile-375",
          visibleElements: ["car", "key"],
          relationships: ["key turns a car"],
          hypotheses: [{ answer: "turn key", confidence: 0.9, rationale: "stronger reading" }],
          confidence: 0.9,
        },
      ],
    });

    expect(summary.targetFoundBy).toBe(1);
    expect(summary.profileResults[0]).toMatchObject({
      profileId: "mobile-375",
      judgeCount: 2,
      topTargetFoundBy: 1,
      dominantTargetFoundBy: 1,
    });
    expect(summary.profilesWithTarget).toBe(0);
    expect(summary.profilesWithTopTarget).toBe(0);
    expect(summary.profilesWithDominantTarget).toBe(0);
  });

  it("does not count duplicate solves from one model as independent agreement", () => {
    const attempt = {
      model: "vision-a",
      profileId: "mobile-375",
      visibleElements: ["car", "key"],
      relationships: ["car plus key"],
      hypotheses: [{ answer: "car key", confidence: 0.9, rationale: "literal compound" }],
      confidence: 0.9,
    };
    const summary = summarizeBlindSolveAttempts({
      answer: "car key",
      attempts: [attempt, { ...attempt }],
    });

    expect(summary.judgeCount).toBe(1);
    expect(summary.profileResults[0]?.judgeCount).toBe(1);
    expect(summary.profilesWithTarget).toBe(0);
  });

  it("fails closed when no blind judge returns", () => {
    const summary = summarizeBlindSolveAttempts({ answer: "car key", attempts: [] });
    expect(summary.estimatedSolveRate).toBe(0);
    expect(summary.confidence).toBe(0);
    expect(summary.meanReciprocalRank).toBe(0);
  });
});
