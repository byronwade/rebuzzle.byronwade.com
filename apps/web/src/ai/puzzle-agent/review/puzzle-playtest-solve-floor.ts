import {
  type BinomialInterval,
  ONE_SIDED_95_Z,
  wilsonScoreInterval,
} from "@/ai/statistics/binomial";

export function expectedHumanSolveFloor(difficultyScore: number): number {
  if (difficultyScore <= 5) return 0.65;
  if (difficultyScore <= 6) return 0.5;
  if (difficultyScore <= 7) return 0.35;
  return 0.2;
}

export function humanSolveFloorEvidence(
  correct: number,
  decisions: number,
  difficultyScore: number
): BinomialInterval & { expectedFloor: number; passes: boolean } {
  const evidence = wilsonScoreInterval(correct, decisions, ONE_SIDED_95_Z);
  const expectedFloor = expectedHumanSolveFloor(difficultyScore);
  return {
    ...evidence,
    expectedFloor,
    passes: evidence.lower >= expectedFloor,
  };
}
