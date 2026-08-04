import {
  mergeTechniqueSolveRates,
  playtestTechniqueDriftIssues,
  techniqueRatesFromPlaytestStrata,
} from "../playtest-calibration";

describe("playtest calibration bridge", () => {
  it("maps techniqueScores rows into solve-rate priors", () => {
    const rates = techniqueRatesFromPlaytestStrata(
      [
        { id: "nested_homophone", decisions: 12, solveRate: 0.3 },
        { id: "simple_compound", decisions: 2, solveRate: 0.95 },
        { id: "rare_but_fair_idiom", decisions: 8, solveRate: null },
      ],
      4
    );
    expect(rates).toEqual([{ techniqueId: "nested_homophone", sampleSize: 12, solveRate: 0.3 }]);
  });

  it("weights playtest over live when both exist", () => {
    const merged = mergeTechniqueSolveRates(
      [{ techniqueId: "simple_compound", sampleSize: 10, solveRate: 0.9 }],
      [{ techniqueId: "simple_compound", sampleSize: 20, solveRate: 0.5 }],
      0.65
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]!.sampleSize).toBe(30);
    expect(merged[0]!.solveRate).toBeCloseTo(0.9 * 0.35 + 0.5 * 0.65, 5);
  });

  it("flags crushed techniques when the window is too easy", () => {
    const issues = playtestTechniqueDriftIssues({
      tooEasy: true,
      tooHard: false,
      rates: [
        { techniqueId: "simple_compound", sampleSize: 20, solveRate: 0.92 },
        { techniqueId: "nested_homophone", sampleSize: 3, solveRate: 0.95 },
      ],
    });
    expect(issues.join(" ")).toMatch(/simple_compound/);
    expect(issues.join(" ")).not.toMatch(/nested_homophone/);
  });
});
