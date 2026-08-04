import {
  blendScoreWithElo,
  ELO_BASE,
  eloFitBonus,
  eloFromDifficultyHint,
  eloFromSolveRate,
  eloPriorForTechnique,
  resolveCandidateElo,
  shrinkEloTowardBase,
  targetEloForDifficulty,
} from "../elo-ratings";

describe("elo ratings", () => {
  it("maps solve rate and difficulty onto a stable Elo ladder", () => {
    expect(eloFromSolveRate(0.5)).toBe(ELO_BASE);
    expect(eloFromSolveRate(0.3)).toBeGreaterThan(ELO_BASE);
    expect(eloFromSolveRate(0.7)).toBeLessThan(ELO_BASE);
    expect(eloFromDifficultyHint(1)).toBe(1200);
    expect(eloFromDifficultyHint(10)).toBe(1800);
    expect(targetEloForDifficulty(5)).toBe(eloFromDifficultyHint(5));
  });

  it("shrinks thin samples toward base and reads technique priors", () => {
    expect(shrinkEloTowardBase(1700, 0)).toBe(ELO_BASE);
    expect(shrinkEloTowardBase(1700, 12)).toBe(1700);
    expect(
      eloPriorForTechnique("simple_compound", [
        { techniqueId: "simple_compound", sampleSize: 10, solveRate: 0.8 },
      ])
    ).toBeLessThan(ELO_BASE);
    expect(eloPriorForTechnique("missing", [])).toBe(ELO_BASE);
  });

  it("nudges tournament scores toward target Elo without overriding hard fails", () => {
    expect(blendScoreWithElo(-1, 1600, 1500)).toBe(-1);
    expect(eloFitBonus(1500, 1500)).toBeGreaterThan(eloFitBonus(1700, 1500));
    expect(blendScoreWithElo(80, 1500, 1500)).toBeGreaterThan(80);
  });

  it("prefers answer overrides and estimated solve rate when present", () => {
    expect(
      resolveCandidateElo(
        { techniqueId: "simple_compound", answer: "doorbell", difficulty: 4 },
        { answerEloByKey: new Map([["doorbell", 1625]]) }
      )
    ).toBe(1625);
    expect(
      resolveCandidateElo({
        techniqueId: "simple_compound",
        answer: "doorbell",
        difficulty: 4,
        estimatedSolveRate: 0.2,
      })
    ).toBe(eloFromSolveRate(0.2));
  });
});
