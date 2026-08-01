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
    // UTC Wednesday = 3 → spine 6 (Difficult)
    const wed = new Date("2026-07-29T12:00:00.000Z");
    expect(baselineDifficultyForDate(wed)).toBe(WEEKLY_DIFFICULTY_SPINE[3]);
    expect(baselineDifficultyForDate(wed)).toBe(6);
  });

  it("averages in the Difficult band (~6/10) across the week", () => {
    const avg =
      WEEKLY_DIFFICULTY_SPINE.reduce((sum, n) => sum + n, 0) / WEEKLY_DIFFICULTY_SPINE.length;
    expect(avg).toBeGreaterThanOrEqual(5.5);
    expect(avg).toBeLessThanOrEqual(7);
  });

  it("keeps soft weekend days and a Friday Impossible peak", () => {
    expect(WEEKLY_DIFFICULTY_SPINE[0]).toBe(5); // Sun Hard
    expect(WEEKLY_DIFFICULTY_SPINE[5]).toBe(8); // Fri Impossible
    expect(WEEKLY_DIFFICULTY_SPINE[6]).toBe(5); // Sat Hard
  });

  it("raises difficulty when players finish too quickly", () => {
    const wed = new Date("2026-07-29T12:00:00.000Z"); // baseline 6
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
    expect(result.baseline).toBe(6);
    expect(result.target).toBe(7);
    expect(result.delta).toBe(1);
  });

  it("eases difficulty when solve rate collapses", () => {
    const mon = new Date("2026-07-27T12:00:00.000Z"); // baseline 6
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
    expect(result.baseline).toBe(6);
    expect(result.target).toBe(5);
  });

  it("clamps into the Hard–Impossible generation band", () => {
    expect(clampGenerationDifficulty(2)).toBe(4);
    expect(clampGenerationDifficulty(12)).toBe(9);
    expect(clampGenerationDifficulty(6.4)).toBe(6);
  });
});
