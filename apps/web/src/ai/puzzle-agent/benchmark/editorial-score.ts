import { listAllTechniques } from "../technique-library";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "../visual/presentation";
import {
  type BenchmarkSlice,
  PUZZLE_EDITORIAL_FAILURE_KINDS,
  PUZZLE_GENERATOR_BENCHMARK_VERSION,
  type PuzzleEditorialBenchmarkCase,
  type PuzzleEditorialBenchmarkObservation,
  type PuzzleEditorialBenchmarkReport,
} from "./types";

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function observationPassed(
  benchmarkCase: PuzzleEditorialBenchmarkCase,
  observation: PuzzleEditorialBenchmarkObservation
): boolean {
  return benchmarkCase.expected === "publish"
    ? observation.publishVotes >= 2 && observation.rejectVotes === 0
    : observation.rejectVotes >= 1;
}

function scoreSlice(input: {
  cases: PuzzleEditorialBenchmarkCase[];
  observations: PuzzleEditorialBenchmarkObservation[];
  predicate: (benchmarkCase: PuzzleEditorialBenchmarkCase) => boolean;
}): BenchmarkSlice {
  const caseById = new Map(input.cases.map((entry) => [entry.id, entry]));
  const selected = input.observations.filter((observation) => {
    const benchmarkCase = caseById.get(observation.caseId);
    return Boolean(benchmarkCase && input.predicate(benchmarkCase));
  });
  const passed = selected.filter((observation) => {
    const benchmarkCase = caseById.get(observation.caseId)!;
    return observationPassed(benchmarkCase, observation);
  }).length;
  return { total: selected.length, passed, rate: rate(passed, selected.length) };
}

/** Score both false-reject resistance and known-failure detection. */
export function scorePuzzleEditorialBenchmark(input: {
  cases: PuzzleEditorialBenchmarkCase[];
  observations: PuzzleEditorialBenchmarkObservation[];
}): PuzzleEditorialBenchmarkReport {
  const caseById = new Map(input.cases.map((entry) => [entry.id, entry]));
  const allowedProfiles = new Set<string>(
    PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => profile.id)
  );
  const validObservations = input.observations.filter(
    (observation) => caseById.has(observation.caseId) && allowedProfiles.has(observation.profileId)
  );
  const observationByKey = new Map(
    validObservations.map((observation) => [
      `${observation.caseId}@${observation.profileId}`,
      observation,
    ])
  );
  const expectedKeys = input.cases.flatMap((entry) =>
    PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => `${entry.id}@${profile.id}`)
  );
  const observations = [...observationByKey.values()];
  const positives = input.cases.filter((entry) => entry.expected === "publish");
  const negatives = input.cases.filter((entry) => entry.expected === "reject");
  const positiveIds = new Set(positives.map((entry) => entry.id));
  const negativeIds = new Set(negatives.map((entry) => entry.id));
  const positiveObservations = observations.filter((entry) => positiveIds.has(entry.caseId));
  const negativeObservations = observations.filter((entry) => negativeIds.has(entry.caseId));
  const compactNegativeObservations = negativeObservations.filter(
    (entry) => entry.profileId === "compact-320"
  );
  const positiveAcceptanceRate = rate(
    positiveObservations.filter((entry) => entry.publishVotes >= 2 && entry.rejectVotes === 0)
      .length,
    positives.length * PUZZLE_BOARD_RECOGNITION_PROFILES.length
  );
  const failureDetectionRate = rate(
    negativeObservations.filter((entry) => entry.rejectVotes >= 1).length,
    negatives.length * PUZZLE_BOARD_RECOGNITION_PROFILES.length
  );
  const failureConsensusRate = rate(
    negativeObservations.filter((entry) => entry.rejectVotes >= 2).length,
    negatives.length * PUZZLE_BOARD_RECOGNITION_PROFILES.length
  );
  const compactFailureDetectionRate = rate(
    compactNegativeObservations.filter((entry) => entry.rejectVotes >= 1).length,
    negatives.length
  );
  const missingObservations = expectedKeys.filter((key) => !observationByKey.has(key));
  const coverage = rate(observationByKey.size, expectedKeys.length);
  const independentJudgeCoverage = rate(
    observations.filter((entry) => entry.judgeCount >= 2).length,
    expectedKeys.length
  );
  const representedFailureKinds = new Set(negatives.flatMap((entry) => entry.failureKinds));
  const failureKindCoverage = rate(
    representedFailureKinds.size,
    PUZZLE_EDITORIAL_FAILURE_KINDS.length
  );
  const criticalFailures = observations
    .filter((observation) => {
      const benchmarkCase = caseById.get(observation.caseId);
      return Boolean(benchmarkCase?.critical && !observationPassed(benchmarkCase, observation));
    })
    .map((observation) => `${observation.caseId}@${observation.profileId}`);

  const automatedFailures = [
    ...(coverage < 1 ? [`Coverage ${(coverage * 100).toFixed(1)}% is below 100%`] : []),
    ...(independentJudgeCoverage < 1
      ? [`Independent-judge coverage ${(independentJudgeCoverage * 100).toFixed(1)}% is below 100%`]
      : []),
    ...(positiveAcceptanceRate < 0.95
      ? [`Good-puzzle acceptance ${(positiveAcceptanceRate * 100).toFixed(1)}% is below 95%`]
      : []),
    ...(failureDetectionRate < 0.99
      ? [`Known-failure detection ${(failureDetectionRate * 100).toFixed(1)}% is below 99%`]
      : []),
    ...(failureConsensusRate < 0.9
      ? [`Known-failure consensus ${(failureConsensusRate * 100).toFixed(1)}% is below 90%`]
      : []),
    ...(compactFailureDetectionRate < 0.99
      ? [
          `Compact known-failure detection ${(compactFailureDetectionRate * 100).toFixed(1)}% is below 99%`,
        ]
      : []),
    ...(failureKindCoverage < 1
      ? [`Failure-kind coverage ${(failureKindCoverage * 100).toFixed(1)}% is below 100%`]
      : []),
    ...(criticalFailures.length
      ? [`Critical editorial failures: ${criticalFailures.slice(0, 8).join(", ")}`]
      : []),
    ...(missingObservations.length
      ? [`Missing observations: ${missingObservations.slice(0, 8).join(", ")}`]
      : []),
  ];

  const techniqueCoverage = rate(
    new Set(positives.map((entry) => entry.techniqueId)).size,
    listAllTechniques().length
  );
  const failureKindCounts = new Map(
    PUZZLE_EDITORIAL_FAILURE_KINDS.map((kind) => [
      kind,
      negatives.filter((entry) => entry.failureKinds.includes(kind)).length,
    ])
  );
  const underfilledKinds = [...failureKindCounts.entries()]
    .filter(([, count]) => count < 10)
    .map(([kind, count]) => `${kind}:${count}`);
  const marketReadinessFailures = [
    ...(positives.length < 150 ? [`Positive editorial corpus ${positives.length}/150`] : []),
    ...(negatives.length < 100 ? [`Known-failure corpus ${negatives.length}/100`] : []),
    ...(techniqueCoverage < 1
      ? [`Technique coverage ${(techniqueCoverage * 100).toFixed(1)}% is below 100%`]
      : []),
    ...(underfilledKinds.length
      ? [`Failure kinds need at least 10 vetted cases each: ${underfilledKinds.join(", ")}`]
      : []),
  ];
  const promotionFailures = [...automatedFailures, ...marketReadinessFailures];

  return {
    version: PUZZLE_GENERATOR_BENCHMARK_VERSION,
    expectedObservations: expectedKeys.length,
    observed: observationByKey.size,
    coverage,
    independentJudgeCoverage,
    positiveAcceptanceRate,
    failureDetectionRate,
    failureConsensusRate,
    compactFailureDetectionRate,
    failureKindCoverage,
    criticalFailures,
    missingObservations,
    slices: {
      positive: scoreSlice({
        cases: input.cases,
        observations,
        predicate: (entry) => entry.expected === "publish",
      }),
      negative: scoreSlice({
        cases: input.cases,
        observations,
        predicate: (entry) => entry.expected === "reject",
      }),
      ...Object.fromEntries(
        PUZZLE_EDITORIAL_FAILURE_KINDS.map((kind) => [
          kind,
          scoreSlice({
            cases: input.cases,
            observations,
            predicate: (entry) => entry.failureKinds.includes(kind),
          }),
        ])
      ),
    },
    automatedGate: {
      passed: automatedFailures.length === 0,
      failures: automatedFailures,
    },
    marketReadiness: {
      passed: marketReadinessFailures.length === 0,
      positiveCases: positives.length,
      negativeCases: negatives.length,
      techniqueCoverage,
      failures: marketReadinessFailures,
    },
    promotion: {
      passed: promotionFailures.length === 0,
      failures: promotionFailures,
    },
  };
}

export function comparePuzzleEditorialBenchmarkReports(input: {
  candidate: PuzzleEditorialBenchmarkReport;
  baseline?: PuzzleEditorialBenchmarkReport;
}): { passed: boolean; failures: string[] } {
  const failures = [...input.candidate.promotion.failures];
  const baseline = input.baseline;
  if (baseline) {
    if (input.candidate.version !== baseline.version) {
      failures.push(
        `Editorial baseline version ${baseline.version} is incompatible with candidate ${input.candidate.version}`
      );
      return { passed: false, failures: Array.from(new Set(failures)) };
    }
    if (input.candidate.positiveAcceptanceRate < baseline.positiveAcceptanceRate - 0.01) {
      failures.push("Good-puzzle acceptance regressed by more than 1 percentage point");
    }
    if (input.candidate.failureDetectionRate < baseline.failureDetectionRate - 0.005) {
      failures.push("Known-failure detection regressed by more than 0.5 percentage points");
    }
    if (
      input.candidate.compactFailureDetectionRate <
      baseline.compactFailureDetectionRate - 0.005
    ) {
      failures.push("Compact failure detection regressed by more than 0.5 percentage points");
    }
    const newCritical = input.candidate.criticalFailures.filter(
      (failure) => !baseline.criticalFailures.includes(failure)
    );
    if (newCritical.length) {
      failures.push(`New critical editorial failures: ${newCritical.slice(0, 8).join(", ")}`);
    }
  }
  return { passed: failures.length === 0, failures: Array.from(new Set(failures)) };
}
