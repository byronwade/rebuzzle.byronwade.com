export const DAILY_SOLVE_DISTRIBUTION_MINIMUM_SOLVES = 20;

export type DailySolveBucket = "oneGuess" | "twoGuesses" | "threeGuesses" | "fourPlus";

export interface DailySolveCounts {
  oneGuess: number;
  twoGuesses: number;
  threeGuesses: number;
  fourPlus: number;
}

export interface DailySolveDistributionPayload {
  available: boolean;
  minimumSolves: number;
  oneGuessPercent: number;
  twoGuessesPercent: number;
  threeGuessesPercent: number;
  fourPlusPercent: number;
}

const BUCKETS: readonly DailySolveBucket[] = ["oneGuess", "twoGuesses", "threeGuesses", "fourPlus"];

export function bucketForAttemptNumber(attemptNumber: number): DailySolveBucket | null {
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) return null;
  if (attemptNumber === 1) return "oneGuess";
  if (attemptNumber === 2) return "twoGuesses";
  if (attemptNumber === 3) return "threeGuesses";
  return "fourPlus";
}

function sanitizeCounts(counts: DailySolveCounts): DailySolveCounts {
  const sanitize = (value: number) => (Number.isSafeInteger(value) && value >= 0 ? value : 0);
  return {
    oneGuess: sanitize(counts.oneGuess),
    twoGuesses: sanitize(counts.twoGuesses),
    threeGuesses: sanitize(counts.threeGuesses),
    fourPlus: sanitize(counts.fourPlus),
  };
}

function roundToFivePointDistribution(counts: DailySolveCounts, total: number): number[] {
  const exactUnits = BUCKETS.map((bucket) => (counts[bucket] / total) * 20);
  const units = exactUnits.map(Math.floor);
  const remainingUnits = 20 - units.reduce((sum, value) => sum + value, 0);
  const rankedRemainders = exactUnits
    .map((value, index) => ({ index, remainder: value - (units[index] ?? 0) }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);

  for (let index = 0; index < remainingUnits; index += 1) {
    const winner = rankedRemainders[index % rankedRemainders.length];
    if (winner) units[winner.index] = (units[winner.index] ?? 0) + 1;
  }

  return units.map((value) => value * 5);
}

export function buildDailySolveDistribution(
  counts: DailySolveCounts
): DailySolveDistributionPayload {
  const sanitized = sanitizeCounts(counts);
  const total = BUCKETS.reduce((sum, bucket) => sum + sanitized[bucket], 0);

  if (total < DAILY_SOLVE_DISTRIBUTION_MINIMUM_SOLVES) {
    return {
      available: false,
      minimumSolves: DAILY_SOLVE_DISTRIBUTION_MINIMUM_SOLVES,
      oneGuessPercent: 0,
      twoGuessesPercent: 0,
      threeGuessesPercent: 0,
      fourPlusPercent: 0,
    };
  }

  const [oneGuessPercent = 0, twoGuessesPercent = 0, threeGuessesPercent = 0, fourPlusPercent = 0] =
    roundToFivePointDistribution(sanitized, total);

  return {
    available: true,
    minimumSolves: DAILY_SOLVE_DISTRIBUTION_MINIMUM_SOLVES,
    oneGuessPercent,
    twoGuessesPercent,
    threeGuessesPercent,
    fourPlusPercent,
  };
}
