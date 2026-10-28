import { bucketForAttemptNumber, buildDailySolveDistribution } from "../daily-solve-distribution";

describe("daily solve distribution", () => {
  it("withholds results below the 20-solver privacy threshold", () => {
    const result = buildDailySolveDistribution({
      oneGuess: 19,
      twoGuesses: 0,
      threeGuesses: 0,
      fourPlus: 0,
    });

    expect(result).toEqual({
      available: false,
      minimumSolves: 20,
      oneGuessPercent: 0,
      twoGuessesPercent: 0,
      threeGuessesPercent: 0,
      fourPlusPercent: 0,
    });
    expect(result).not.toHaveProperty("solverCount");
  });

  it("returns percentages in five-point increments that total 100", () => {
    const result = buildDailySolveDistribution({
      oneGuess: 7,
      twoGuesses: 6,
      threeGuesses: 4,
      fourPlus: 4,
    });
    const percentages = [
      result.oneGuessPercent,
      result.twoGuessesPercent,
      result.threeGuessesPercent,
      result.fourPlusPercent,
    ];

    expect(result.available).toBe(true);
    expect(percentages.reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(percentages.every((value) => value >= 0 && value <= 100 && value % 5 === 0)).toBe(true);
    expect(percentages).toEqual([30, 30, 20, 20]);
  });

  it("maps valid attempts into the four public buckets", () => {
    expect(bucketForAttemptNumber(1)).toBe("oneGuess");
    expect(bucketForAttemptNumber(2)).toBe("twoGuesses");
    expect(bucketForAttemptNumber(3)).toBe("threeGuesses");
    expect(bucketForAttemptNumber(4)).toBe("fourPlus");
    expect(bucketForAttemptNumber(12)).toBe("fourPlus");
  });

  it("rejects malformed attempt numbers and ignores malformed aggregate counts", () => {
    for (const attempt of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(bucketForAttemptNumber(attempt)).toBeNull();
    }

    const result = buildDailySolveDistribution({
      oneGuess: 10,
      twoGuesses: -5,
      threeGuesses: 1.25,
      fourPlus: Number.NaN,
    });
    expect(result.available).toBe(false);
    expect(result.oneGuessPercent).toBe(0);
  });
});
