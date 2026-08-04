import { applyEloMatch, expectedEloScore, planPlaytestEloMatches } from "../elo-store";

describe("pairwise Elo store math", () => {
  it("gives equal ratings 50/50 expected score", () => {
    expect(expectedEloScore(1500, 1500)).toBeCloseTo(0.5, 5);
  });

  it("moves ratings when a harder answer beats an easier one", () => {
    const next = applyEloMatch(1500, 1500, 24);
    expect(next.winner).toBeGreaterThan(1500);
    expect(next.loser).toBeLessThan(1500);
    expect(next.winner - 1500).toBe(1500 - next.loser);
  });

  it("plans answer and technique matches from playtest solve rates", () => {
    const matches = planPlaytestEloMatches({
      minDecisions: 4,
      candidates: [
        {
          answer: "nested sound",
          techniqueId: "nested_homophone",
          decisions: 12,
          solveRate: 0.25,
        },
        {
          answer: "easy compound",
          techniqueId: "nested_homophone",
          decisions: 12,
          solveRate: 0.9,
        },
        {
          answer: "rare idiom",
          techniqueId: "rare_but_fair_idiom",
          decisions: 10,
          solveRate: 0.4,
        },
        {
          answer: "fair idiom",
          techniqueId: "rare_but_fair_idiom",
          decisions: 10,
          solveRate: 0.7,
        },
        {
          answer: "thin sample",
          techniqueId: "simple_compound",
          decisions: 2,
          solveRate: 0.1,
        },
      ],
    });

    expect(matches).toEqual(
      expect.arrayContaining([
        {
          winnerKey: "nested sound",
          loserKey: "easy compound",
          kind: "answer",
        },
        {
          winnerKey: "rare idiom",
          loserKey: "fair idiom",
          kind: "answer",
        },
        {
          // Technique avg: rare_but_fair_idiom 0.55 < nested_homophone 0.575
          winnerKey: "rare_but_fair_idiom",
          loserKey: "nested_homophone",
          kind: "technique",
        },
      ])
    );
    expect(matches.every((match) => match.winnerKey !== "thin sample")).toBe(true);
  });
});
