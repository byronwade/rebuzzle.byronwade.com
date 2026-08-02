import { BLIND_SOLVE_REQUIRED_VOTES } from "../quality-contract";
import {
  EXTERNAL_REASONING_FEATURES,
  type ExternalPuzzleFixture,
  type ExternalReasoningFeature,
} from "./external-corpus";
import { type BenchmarkSlice, PUZZLE_GENERATOR_BENCHMARK_VERSION } from "./types";

export type ExternalPuzzleBenchmarkObservation = {
  caseId: string;
  targetFoundBy: number;
  topTargetFoundBy: number;
  dominantTargetFoundBy: number;
  judgeCount: number;
  targetConfidence: number;
  strongestWrongConfidence: number;
  meanReciprocalRank: number;
  wrongParses: string[];
  error?: string;
};

export type ExternalPuzzleBenchmarkReport = {
  version: string;
  datasetId: string;
  revision: string;
  expectedCases: number;
  observedCases: number;
  coverage: number;
  independentJudgeCoverage: number;
  targetDetectionRate: number;
  topTargetDetectionRate: number;
  dominantTargetDetectionRate: number;
  meanReciprocalRank: number;
  slices: {
    difficulties: Record<string, BenchmarkSlice>;
    reasoningFeatures: Record<ExternalReasoningFeature, BenchmarkSlice>;
  };
  missingCases: string[];
  promotion: { passed: boolean; failures: string[] };
};

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function scoreSlice(
  cases: ExternalPuzzleFixture[],
  observationById: Map<string, ExternalPuzzleBenchmarkObservation>
): BenchmarkSlice {
  const observations = cases.flatMap((entry) => {
    const observation = observationById.get(entry.id);
    return observation ? [observation] : [];
  });
  const passed = observations.filter(
    (entry) =>
      entry.judgeCount >= BLIND_SOLVE_REQUIRED_VOTES &&
      entry.topTargetFoundBy >= BLIND_SOLVE_REQUIRED_VOTES &&
      entry.dominantTargetFoundBy >= BLIND_SOLVE_REQUIRED_VOTES
  ).length;
  return { total: cases.length, passed, rate: rate(passed, cases.length) };
}

/**
 * Validates the blind screenshot evaluator on human-vetted, out-of-domain
 * puzzles. This score never trains or prompts the production generator.
 */
export function scoreExternalPuzzleBenchmark(input: {
  cases: ExternalPuzzleFixture[];
  observations: ExternalPuzzleBenchmarkObservation[];
  revision: string;
}): ExternalPuzzleBenchmarkReport {
  const invalidCases = input.cases.filter(
    (entry) => entry.isAugmented || !entry.eligibleForEvaluation
  );
  const caseById = new Map(input.cases.map((entry) => [entry.id, entry]));
  const validObservations = input.observations.filter((entry) => caseById.has(entry.caseId));
  const observationById = new Map(validObservations.map((entry) => [entry.caseId, entry]));
  const observations = [...observationById.values()];
  const missingCases = input.cases
    .filter((entry) => !observationById.has(entry.id))
    .map((entry) => entry.id);
  const expectedCases = input.cases.length;
  const coverage = rate(observationById.size, expectedCases);
  const independentJudgeCoverage = rate(
    observations.filter((entry) => entry.judgeCount >= 2).length,
    expectedCases
  );
  const targetDetectionRate = rate(
    observations.filter(
      (entry) =>
        entry.judgeCount >= BLIND_SOLVE_REQUIRED_VOTES &&
        entry.targetFoundBy >= BLIND_SOLVE_REQUIRED_VOTES
    ).length,
    expectedCases
  );
  const topTargetDetectionRate = rate(
    observations.filter(
      (entry) =>
        entry.judgeCount >= BLIND_SOLVE_REQUIRED_VOTES &&
        entry.topTargetFoundBy >= BLIND_SOLVE_REQUIRED_VOTES
    ).length,
    expectedCases
  );
  const dominantTargetDetectionRate = rate(
    observations.filter(
      (entry) =>
        entry.judgeCount >= BLIND_SOLVE_REQUIRED_VOTES &&
        entry.dominantTargetFoundBy >= BLIND_SOLVE_REQUIRED_VOTES
    ).length,
    expectedCases
  );
  const meanReciprocalRank = rate(
    observations.reduce((sum, entry) => sum + entry.meanReciprocalRank, 0),
    expectedCases
  );
  const representedDifficulties = Array.from(
    new Set(
      input.cases
        .map((entry) => entry.difficulty.toUpperCase())
        .filter((difficulty) => difficulty && difficulty !== "UNKNOWN")
    )
  ).sort();
  const failures = [
    ...(invalidCases.length
      ? [`External benchmark includes ${invalidCases.length} unapproved or augmented cases`]
      : []),
    ...(expectedCases < 100 ? [`External benchmark corpus ${expectedCases}/100 cases`] : []),
    ...(coverage < 1
      ? [`External benchmark coverage ${(coverage * 100).toFixed(1)}% is below 100%`]
      : []),
    ...(independentJudgeCoverage < 1
      ? [
          `External independent-judge coverage ${(independentJudgeCoverage * 100).toFixed(1)}% is below 100%`,
        ]
      : []),
    ...(targetDetectionRate < 0.85
      ? [`External target detection ${(targetDetectionRate * 100).toFixed(1)}% is below 85%`]
      : []),
    ...(topTargetDetectionRate < 0.7
      ? [`External top-1 detection ${(topTargetDetectionRate * 100).toFixed(1)}% is below 70%`]
      : []),
    ...(dominantTargetDetectionRate < 0.6
      ? [
          `External dominant-answer detection ${(dominantTargetDetectionRate * 100).toFixed(1)}% is below 60%`,
        ]
      : []),
    ...(meanReciprocalRank < 0.75
      ? [`External mean reciprocal rank ${meanReciprocalRank.toFixed(3)} is below 0.750`]
      : []),
    ...(representedDifficulties.length < 2
      ? [`External benchmark covers ${representedDifficulties.length}/2 difficulty bands`]
      : []),
    ...EXTERNAL_REASONING_FEATURES.flatMap((feature) => {
      const count = input.cases.filter((entry) => entry.reasoningFeatures.includes(feature)).length;
      return count < 5 ? [`External feature ${feature} has ${count}/5 cases`] : [];
    }),
    ...(missingCases.length
      ? [`Missing external cases: ${missingCases.slice(0, 8).join(", ")}`]
      : []),
  ];
  return {
    version: PUZZLE_GENERATOR_BENCHMARK_VERSION,
    datasetId: input.cases[0]?.datasetId ?? "unknown",
    revision: input.revision,
    expectedCases,
    observedCases: observationById.size,
    coverage,
    independentJudgeCoverage,
    targetDetectionRate,
    topTargetDetectionRate,
    dominantTargetDetectionRate,
    meanReciprocalRank,
    slices: {
      difficulties: Object.fromEntries(
        representedDifficulties.map((difficulty) => [
          difficulty,
          scoreSlice(
            input.cases.filter((entry) => entry.difficulty.toUpperCase() === difficulty),
            observationById
          ),
        ])
      ),
      reasoningFeatures: Object.fromEntries(
        EXTERNAL_REASONING_FEATURES.map((feature) => [
          feature,
          scoreSlice(
            input.cases.filter((entry) => entry.reasoningFeatures.includes(feature)),
            observationById
          ),
        ])
      ) as Record<ExternalReasoningFeature, BenchmarkSlice>,
    },
    missingCases,
    promotion: { passed: failures.length === 0, failures },
  };
}

export function compareExternalPuzzleBenchmarkReports(input: {
  candidate: ExternalPuzzleBenchmarkReport;
  baseline?: ExternalPuzzleBenchmarkReport;
}): { passed: boolean; failures: string[] } {
  const failures = [...input.candidate.promotion.failures];
  const baseline = input.baseline;
  if (baseline) {
    if (
      input.candidate.version !== baseline.version ||
      input.candidate.datasetId !== baseline.datasetId ||
      input.candidate.revision !== baseline.revision
    ) {
      failures.push("External baseline is incompatible with the candidate benchmark");
      return { passed: false, failures: Array.from(new Set(failures)) };
    }
    if (input.candidate.topTargetDetectionRate < baseline.topTargetDetectionRate - 0.01) {
      failures.push("External top-1 detection regressed by more than 1 percentage point");
    }
    if (input.candidate.dominantTargetDetectionRate < baseline.dominantTargetDetectionRate - 0.01) {
      failures.push("External dominant-answer detection regressed by more than 1 percentage point");
    }
    if (input.candidate.meanReciprocalRank < baseline.meanReciprocalRank - 0.01) {
      failures.push("External mean reciprocal rank regressed by more than 0.01");
    }
  }
  return { passed: failures.length === 0, failures: Array.from(new Set(failures)) };
}
