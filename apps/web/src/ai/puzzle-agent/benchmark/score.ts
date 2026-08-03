import {
  type BenchmarkSlice,
  ICON_BENCHMARK_TILE_SIZES,
  type IconBenchmarkCase,
  type IconBenchmarkObservation,
  type IconBenchmarkReport,
  PUZZLE_GENERATOR_BENCHMARK_VERSION,
} from "./types";

function safeRate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function scoreSlice(
  observations: IconBenchmarkObservation[],
  predicate: (observation: IconBenchmarkObservation) => boolean
): BenchmarkSlice {
  const selected = observations.filter(predicate);
  const passed = selected.filter((observation) =>
    observation.expected === "accept" ? observation.accepted : !observation.accepted
  ).length;
  return { total: selected.length, passed, rate: safeRate(passed, selected.length) };
}

/**
 * Score evaluator behavior against a frozen corpus. Missing evidence is a
 * failure, not an ignored case, and market-leading thresholds are explicit.
 */
export function scoreIconBenchmark(input: {
  cases: IconBenchmarkCase[];
  observations: IconBenchmarkObservation[];
}): IconBenchmarkReport {
  const caseById = new Map(input.cases.map((entry) => [entry.id, entry]));
  const allowedTileSizes = new Set<number>(ICON_BENCHMARK_TILE_SIZES);
  const validObservations = input.observations.filter(
    (observation) => caseById.has(observation.caseId) && allowedTileSizes.has(observation.tileSize)
  );
  const observationByKey = new Map(
    validObservations.map((observation) => [
      `${observation.caseId}@${observation.tileSize}`,
      observation,
    ])
  );
  const expectedKeys = input.cases.flatMap((entry) =>
    ICON_BENCHMARK_TILE_SIZES.map((tileSize) => `${entry.id}@${tileSize}`)
  );
  const missingObservations = expectedKeys.filter((key) => !observationByKey.has(key));
  const expectedObservations = expectedKeys.length;
  const positives = validObservations.filter((observation) => observation.expected === "accept");
  const negatives = validObservations.filter((observation) => observation.expected === "reject");
  const truePositives = positives.filter((observation) => observation.accepted).length;
  const trueNegatives = negatives.filter((observation) => !observation.accepted).length;
  const falseAccepts = negatives.length - trueNegatives;
  const falseRejects = positives.length - truePositives;
  const positiveRecall = safeRate(truePositives, positives.length);
  const negativeRecall = safeRate(trueNegatives, negatives.length);
  const criticalFailures = validObservations
    .filter((observation) => {
      const benchmarkCase = caseById.get(observation.caseId);
      if (!benchmarkCase?.critical) return false;
      return observation.expected === "accept" ? !observation.accepted : observation.accepted;
    })
    .map((observation) => `${observation.caseId}@${observation.tileSize}`);
  const [compactTile = 44, largeTile = 72] = ICON_BENCHMARK_TILE_SIZES;
  const compactPositive = scoreSlice(
    validObservations,
    (observation) => observation.expected === "accept" && observation.tileSize === compactTile
  );
  const largePositive = scoreSlice(
    validObservations,
    (observation) => observation.expected === "accept" && observation.tileSize === largeTile
  );
  const independentJudgeCoverage = safeRate(
    validObservations.filter((observation) => observation.judgeCount >= 2).length,
    expectedObservations
  );
  const coverage = safeRate(observationByKey.size, expectedObservations);
  const promotionFailures = [
    ...(coverage < 1 ? [`Coverage ${(coverage * 100).toFixed(1)}% is below 100%`] : []),
    ...(positiveRecall < 0.97
      ? [`Positive recognition ${(positiveRecall * 100).toFixed(1)}% is below 97%`]
      : []),
    ...(negativeRecall < 0.99
      ? [`Wrong-object rejection ${(negativeRecall * 100).toFixed(1)}% is below 99%`]
      : []),
    ...(compactPositive.rate < 0.95
      ? [`Compact recognition ${(compactPositive.rate * 100).toFixed(1)}% is below 95%`]
      : []),
    ...(independentJudgeCoverage < 1
      ? [`Independent-judge coverage ${(independentJudgeCoverage * 100).toFixed(1)}% is below 100%`]
      : []),
    ...(criticalFailures.length
      ? [`Critical object failures: ${criticalFailures.slice(0, 8).join(", ")}`]
      : []),
    ...(missingObservations.length
      ? [`Missing observations: ${missingObservations.slice(0, 8).join(", ")}`]
      : []),
  ];

  return {
    version: PUZZLE_GENERATOR_BENCHMARK_VERSION,
    expectedObservations,
    observed: observationByKey.size,
    coverage,
    positiveRecall,
    negativeRecall,
    falseAcceptRate: safeRate(falseAccepts, negatives.length),
    falseRejectRate: safeRate(falseRejects, positives.length),
    balancedAccuracy: (positiveRecall + negativeRecall) / 2,
    compactPositiveRecall: compactPositive.rate,
    largePositiveRecall: largePositive.rate,
    independentJudgeCoverage,
    criticalFailures,
    missingObservations,
    slices: {
      "catalog-positive": scoreSlice(
        validObservations,
        (observation) => observation.expected === "accept"
      ),
      "semantic-negative": scoreSlice(
        validObservations,
        (observation) => observation.expected === "reject"
      ),
      [`compact-${compactTile}`]: scoreSlice(
        validObservations,
        (observation) => observation.tileSize === compactTile
      ),
      [`large-${largeTile}`]: scoreSlice(
        validObservations,
        (observation) => observation.tileSize === largeTile
      ),
    },
    promotion: {
      passed: promotionFailures.length === 0,
      failures: promotionFailures,
    },
  };
}

/** Candidate evaluators must clear absolute gates and avoid material baseline regressions. */
export function compareIconBenchmarkReports(input: {
  candidate: IconBenchmarkReport;
  baseline?: IconBenchmarkReport;
}): { passed: boolean; failures: string[] } {
  const failures = [...input.candidate.promotion.failures];
  const baseline = input.baseline;
  if (baseline) {
    if (input.candidate.version !== baseline.version) {
      failures.push(
        `Baseline version ${baseline.version} is incompatible with candidate ${input.candidate.version}`
      );
      return { passed: false, failures: Array.from(new Set(failures)) };
    }
    if (input.candidate.balancedAccuracy < baseline.balancedAccuracy - 0.005) {
      failures.push("Balanced accuracy regressed by more than 0.5 percentage points");
    }
    if (input.candidate.compactPositiveRecall < baseline.compactPositiveRecall - 0.01) {
      failures.push("Compact recognition regressed by more than 1 percentage point");
    }
    if (input.candidate.falseAcceptRate > baseline.falseAcceptRate + 0.005) {
      failures.push("Wrong-object false accepts increased by more than 0.5 percentage points");
    }
    const newCriticalFailures = input.candidate.criticalFailures.filter(
      (failure) => !baseline.criticalFailures.includes(failure)
    );
    if (newCriticalFailures.length) {
      failures.push(`New critical failures: ${newCriticalFailures.slice(0, 8).join(", ")}`);
    }
  }
  return { passed: failures.length === 0, failures: Array.from(new Set(failures)) };
}
