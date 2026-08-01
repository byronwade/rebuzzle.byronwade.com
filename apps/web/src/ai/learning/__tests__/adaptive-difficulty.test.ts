import {
  baselineDifficultyForDate,
  clampGenerationDifficulty,
  computeAdaptiveDifficulty,
  WEEKLY_DIFFICULTY_SPINE,
} from "../adaptive-difficulty";
import type { WindowPerformance } from "../performance-monitor";

function perf(overrides: Partial<WindowPerformance> = {}): WindowPerformance {
  return {
    lookbackDays: 7,
    finalPlays: 40,
    solves: 30,
    abandons: 10,
    solveRate: 0.75,
    abandonRate: 0.25,
    medianSolveSeconds: 90,
    avgSolveSeconds: 100,
    avgAttemptsOnSolve: 1.8,
    avgHintsOnFinal: 0.9,
    puzzleCount: 5,
    tooEasy: false,
    tooHard: false,
    difficultyDelta: 0,
    notes: ["ok"],
    ...overrides,
  };
}

describe("adaptive difficulty", () => {
  it("uses the weekly spine as baseline", () => {
    // UTC Wednesday = 3 → spine 8
    const wed = new Date("2026-07-29T12:00:00.000Z");
    expect(baselineDifficultyForDate(wed)).toBe(WEEKLY_DIFFICULTY_SPINE[3]);
  });

  it("averages near 80% difficulty (~8/10) across the week", () => {
    const avg =
      WEEKLY_DIFFICULTY_SPINE.reduce((sum, n) => sum + n, 0) / WEEKLY_DIFFICULTY_SPINE.length;
    expect(avg).toBeGreaterThanOrEqual(7.5);
    expect(avg).toBeLessThanOrEqual(8.5);
  });

  it("raises difficulty when players finish too quickly", () => {
    const wed = new Date("2026-07-29T12:00:00.000Z"); // baseline 8
    const result = computeAdaptiveDifficulty({
      date: wed,
      performance: perf({
        tooEasy: true,
        difficultyDelta: 1,
        medianSolveSeconds: 28,
        solveRate: 0.88,
        notes: ["too fast"],
      }),
    });
    expect(result.baseline).toBe(8);
    expect(result.target).toBe(9);
    expect(result.delta).toBe(1);
  });

  it("eases difficulty when solve rate collapses", () => {
    const mon = new Date("2026-07-27T12:00:00.000Z"); // baseline 7
    const result = computeAdaptiveDifficulty({
      date: mon,
      performance: perf({
        tooHard: true,
        difficultyDelta: -1,
        solveRate: 0.2,
        abandonRate: 0.6,
        notes: ["too hard"],
      }),
    });
    expect(result.baseline).toBe(7);
    expect(result.target).toBe(6);
  });

  it("clamps into the Hard–Impossible generation band", () => {
    expect(clampGenerationDifficulty(2)).toBe(4);
    expect(clampGenerationDifficulty(12)).toBe(9);
    expect(clampGenerationDifficulty(6.4)).toBe(6);
  });
});
