import {
  type BootstrapMetricInterval,
  type CrossedClusterBootstrapResult,
  crossedClusterBootstrap,
  type WeightedObservation,
} from "@/ai/statistics/crossed-cluster-bootstrap";
import type { PuzzlePlaytestCandidate, PuzzlePlaytestReview } from "@/db/models";
import { humanSolveFloorEvidence } from "./puzzle-playtest-solve-floor";

export type PuzzlePlaytestClusterMetric =
  | "candidateFloorPassRate"
  | "ambiguityRate"
  | "visualFailureRate"
  | "highConfidenceWrongRate"
  | "compactToMobileSolveDifference"
  | "compactToDesktopSolveDifference"
  | "mobileToDesktopSolveDifference"
  | "solveCalibrationMeanAbsoluteError"
  | "solveCalibrationBias";

export type PuzzlePlaytestClusterEvidence =
  CrossedClusterBootstrapResult<PuzzlePlaytestClusterMetric>;

function isVisualFailure(review: PuzzlePlaytestReview): boolean {
  return (
    review.failureReason === "unrecognizable-artwork" ||
    review.failureReason === "unreadable-layout" ||
    review.failureReason === "missing-cue"
  );
}

function weightedRate(
  rows: readonly WeightedObservation<PuzzlePlaytestReview>[],
  predicate: (review: PuzzlePlaytestReview) => boolean
): number {
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  if (total === 0) return Number.NaN;
  return rows.reduce((sum, row) => sum + (predicate(row.observation) ? row.weight : 0), 0) / total;
}

function profileSolveRate(
  rows: readonly WeightedObservation<PuzzlePlaytestReview>[],
  profileId: PuzzlePlaytestReview["profileId"]
): number {
  return weightedRate(
    rows.filter((row) => row.observation.profileId === profileId),
    (review) => review.correct
  );
}

function calibrationMetrics(
  rows: readonly WeightedObservation<PuzzlePlaytestReview>[],
  candidates: ReadonlyMap<string, PuzzlePlaytestCandidate>
): { meanAbsoluteError: number; bias: number } | null {
  const byCandidate = new Map<string, WeightedObservation<PuzzlePlaytestReview>[]>();
  for (const row of rows) {
    const candidateRows = byCandidate.get(row.observation.candidateId) ?? [];
    candidateRows.push(row);
    byCandidate.set(row.observation.candidateId, candidateRows);
  }

  let candidateWeight = 0;
  let absoluteError = 0;
  let signedError = 0;
  for (const [candidateId, candidateRows] of byCandidate) {
    const estimate = candidates.get(candidateId)?.automatedEstimatedSolveRate;
    if (estimate === undefined) continue;
    const reviewerWeightedTotal = candidateRows.reduce((sum, row) => sum + row.rowWeight, 0);
    if (reviewerWeightedTotal === 0) continue;
    const observed =
      candidateRows.reduce((sum, row) => sum + (row.observation.correct ? row.rowWeight : 0), 0) /
      reviewerWeightedTotal;
    const weight = candidateRows[0]!.columnWeight;
    const error = estimate - observed;
    candidateWeight += weight;
    absoluteError += Math.abs(error) * weight;
    signedError += error * weight;
  }
  if (candidateWeight === 0) return null;
  return {
    meanAbsoluteError: absoluteError / candidateWeight,
    bias: signedError / candidateWeight,
  };
}

function candidateFloorPassRate(
  rows: readonly WeightedObservation<PuzzlePlaytestReview>[],
  candidates: ReadonlyMap<string, PuzzlePlaytestCandidate>
): number {
  const byCandidate = new Map<string, WeightedObservation<PuzzlePlaytestReview>[]>();
  for (const row of rows) {
    const candidateRows = byCandidate.get(row.observation.candidateId) ?? [];
    candidateRows.push(row);
    byCandidate.set(row.observation.candidateId, candidateRows);
  }

  let candidateWeight = 0;
  let passingWeight = 0;
  for (const [candidateId, candidateRows] of byCandidate) {
    const candidate = candidates.get(candidateId);
    if (!candidate) continue;
    const decisions = candidateRows.reduce((sum, row) => sum + row.rowWeight, 0);
    if (decisions === 0) continue;
    const correct = candidateRows.reduce(
      (sum, row) => sum + (row.observation.correct ? row.rowWeight : 0),
      0
    );
    const ambiguity = candidateRows.reduce(
      (sum, row) =>
        sum + (row.observation.failureReason === "multiple-answers" ? row.rowWeight : 0),
      0
    );
    const weight = candidateRows[0]!.columnWeight;
    candidateWeight += weight;
    if (
      humanSolveFloorEvidence(correct, decisions, candidate.difficultyScore).passes &&
      ambiguity <= 1
    ) {
      passingWeight += weight;
    }
  }
  return candidateWeight > 0 ? passingWeight / candidateWeight : Number.NaN;
}

/** Crossed reviewer-by-puzzle uncertainty for the metrics used by readiness gates. */
export function estimatePuzzlePlaytestClusterEvidence(input: {
  reviews: readonly PuzzlePlaytestReview[];
  candidates: readonly PuzzlePlaytestCandidate[];
  replicates?: number;
}): PuzzlePlaytestClusterEvidence {
  const candidates = new Map(input.candidates.map((candidate) => [candidate.id, candidate]));
  const seed = input.reviews
    .map((review) => review.id)
    .sort()
    .join("\u0000");

  return crossedClusterBootstrap({
    observations: input.reviews,
    rowCluster: (review) => review.reviewerId,
    columnCluster: (review) => review.candidateId,
    seed,
    replicates: input.replicates,
    statistic: (rows) => {
      const compact = profileSolveRate(rows, "compact-320");
      const mobile = profileSolveRate(rows, "mobile-375");
      const desktop = profileSolveRate(rows, "desktop-768");
      const calibration = calibrationMetrics(rows, candidates);
      return {
        candidateFloorPassRate: candidateFloorPassRate(rows, candidates),
        ambiguityRate: weightedRate(rows, (review) => review.failureReason === "multiple-answers"),
        visualFailureRate: weightedRate(rows, isVisualFailure),
        highConfidenceWrongRate: weightedRate(
          rows,
          (review) => !review.correct && review.confidence >= 4
        ),
        compactToMobileSolveDifference: compact - mobile,
        compactToDesktopSolveDifference: compact - desktop,
        mobileToDesktopSolveDifference: mobile - desktop,
        solveCalibrationMeanAbsoluteError: calibration?.meanAbsoluteError ?? Number.NaN,
        solveCalibrationBias: calibration?.bias ?? Number.NaN,
      };
    },
  });
}

export function absoluteBootstrapBound(interval?: BootstrapMetricInterval): number | null {
  return interval
    ? Math.max(Math.abs(interval.observed), Math.abs(interval.lower), Math.abs(interval.upper))
    : null;
}

export function responsiveSolveGapUpperBound(
  evidence: PuzzlePlaytestClusterEvidence
): number | null {
  const bounds = [
    absoluteBootstrapBound(evidence.metrics.compactToMobileSolveDifference),
    absoluteBootstrapBound(evidence.metrics.compactToDesktopSolveDifference),
    absoluteBootstrapBound(evidence.metrics.mobileToDesktopSolveDifference),
  ].filter((value): value is number => value !== null);
  return bounds.length === 3 ? Math.max(...bounds) : null;
}
