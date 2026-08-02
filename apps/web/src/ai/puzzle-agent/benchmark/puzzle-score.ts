import { BLIND_SOLVE_REQUIRED_VOTES } from "../quality-contract";
import { listAllTechniques } from "../technique-library";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "../visual/presentation";
import {
  PUZZLE_GENERATOR_BENCHMARK_VERSION,
  type PuzzleSolveBenchmarkCase,
  type PuzzleSolveBenchmarkObservation,
  type PuzzleSolveBenchmarkReport,
} from "./types";

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

export function scorePuzzleSolveBenchmark(input: {
  cases: PuzzleSolveBenchmarkCase[];
  observations: PuzzleSolveBenchmarkObservation[];
}): PuzzleSolveBenchmarkReport {
  const caseById = new Map(input.cases.map((entry) => [entry.id, entry]));
  const allowedProfileIds = new Set<string>(
    PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => profile.id)
  );
  const expectedKeys = input.cases.flatMap((entry) =>
    PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => `${entry.id}@${profile.id}`)
  );
  const observationByKey = new Map(
    input.observations
      .filter(
        (observation) =>
          caseById.has(observation.caseId) && allowedProfileIds.has(observation.profileId)
      )
      .map((observation) => [`${observation.caseId}@${observation.profileId}`, observation])
  );
  const missingObservations = expectedKeys.filter((key) => !observationByKey.has(key));
  const observations = [...observationByKey.values()];
  const hasJudgeQuorum = (observation: PuzzleSolveBenchmarkObservation) =>
    observation.judgeCount >= BLIND_SOLVE_REQUIRED_VOTES;
  const detected = observations.filter(
    (observation) =>
      hasJudgeQuorum(observation) && observation.targetFoundBy >= BLIND_SOLVE_REQUIRED_VOTES
  );
  const topDetected = observations.filter(
    (observation) =>
      hasJudgeQuorum(observation) && observation.topTargetFoundBy >= BLIND_SOLVE_REQUIRED_VOTES
  );
  const dominantDetected = observations.filter(
    (observation) =>
      hasJudgeQuorum(observation) && observation.dominantTargetFoundBy >= BLIND_SOLVE_REQUIRED_VOTES
  );
  const compact = observations.filter((observation) => observation.profileId === "compact-320");
  const compactDetected = compact.filter(
    (observation) =>
      hasJudgeQuorum(observation) && observation.targetFoundBy >= BLIND_SOLVE_REQUIRED_VOTES
  );
  const compactTopDetected = compact.filter(
    (observation) =>
      hasJudgeQuorum(observation) && observation.topTargetFoundBy >= BLIND_SOLVE_REQUIRED_VOTES
  );
  const ambiguous = observations.filter(
    (observation) =>
      (observation.targetFoundBy >= BLIND_SOLVE_REQUIRED_VOTES &&
        observation.dominantTargetFoundBy < BLIND_SOLVE_REQUIRED_VOTES) ||
      observation.strongestWrongConfidence > observation.targetConfidence + 0.05
  );
  const criticalFailures = observations
    .filter(
      (observation) =>
        caseById.get(observation.caseId)?.critical &&
        observation.dominantTargetFoundBy < BLIND_SOLVE_REQUIRED_VOTES
    )
    .map((observation) => `${observation.caseId}@${observation.profileId}`);
  const independentJudgeCoverage = rate(
    observations.filter((observation) => observation.judgeCount >= 2).length,
    expectedKeys.length
  );
  const coverage = rate(observationByKey.size, expectedKeys.length);
  const targetDetectionRate = rate(detected.length, expectedKeys.length);
  const topTargetDetectionRate = rate(topDetected.length, expectedKeys.length);
  const dominantTargetDetectionRate = rate(dominantDetected.length, expectedKeys.length);
  const compactTargetDetectionRate = rate(compactDetected.length, input.cases.length);
  const compactTopTargetDetectionRate = rate(compactTopDetected.length, input.cases.length);
  const meanReciprocalRank = rate(
    observations.reduce((sum, observation) => sum + observation.meanReciprocalRank, 0),
    expectedKeys.length
  );
  const ambiguityRate = rate(ambiguous.length, expectedKeys.length);
  const techniqueCoverage = rate(
    new Set(input.cases.map((entry) => entry.techniqueId)).size,
    listAllTechniques().length
  );
  const failures = [
    ...(coverage < 1 ? [`Coverage ${(coverage * 100).toFixed(1)}% is below 100%`] : []),
    ...(independentJudgeCoverage < 1
      ? [`Independent-judge coverage ${(independentJudgeCoverage * 100).toFixed(1)}% is below 100%`]
      : []),
    ...(targetDetectionRate < 0.8
      ? [`Target detection ${(targetDetectionRate * 100).toFixed(1)}% is below 80%`]
      : []),
    ...(topTargetDetectionRate < 0.75
      ? [`Top-answer detection ${(topTargetDetectionRate * 100).toFixed(1)}% is below 75%`]
      : []),
    ...(dominantTargetDetectionRate < 0.7
      ? [
          `Dominant-answer detection ${(dominantTargetDetectionRate * 100).toFixed(1)}% is below 70%`,
        ]
      : []),
    ...(compactTargetDetectionRate < 0.75
      ? [`Compact target detection ${(compactTargetDetectionRate * 100).toFixed(1)}% is below 75%`]
      : []),
    ...(compactTopTargetDetectionRate < 0.7
      ? [
          `Compact top-answer detection ${(compactTopTargetDetectionRate * 100).toFixed(1)}% is below 70%`,
        ]
      : []),
    ...(meanReciprocalRank < 0.75
      ? [`Mean reciprocal rank ${meanReciprocalRank.toFixed(3)} is below 0.750`]
      : []),
    ...(ambiguityRate > 0.1
      ? [`Ambiguous observation rate ${(ambiguityRate * 100).toFixed(1)}% exceeds 10%`]
      : []),
    ...(techniqueCoverage < 0.45
      ? [`Technique coverage ${(techniqueCoverage * 100).toFixed(1)}% is below 45%`]
      : []),
    ...(criticalFailures.length
      ? [`Critical solve failures: ${criticalFailures.slice(0, 8).join(", ")}`]
      : []),
    ...(missingObservations.length
      ? [`Missing observations: ${missingObservations.slice(0, 8).join(", ")}`]
      : []),
  ];

  return {
    version: PUZZLE_GENERATOR_BENCHMARK_VERSION,
    expectedObservations: expectedKeys.length,
    observed: observationByKey.size,
    coverage,
    targetDetectionRate,
    topTargetDetectionRate,
    dominantTargetDetectionRate,
    compactTargetDetectionRate,
    compactTopTargetDetectionRate,
    meanReciprocalRank,
    ambiguityRate,
    independentJudgeCoverage,
    criticalFailures,
    missingObservations,
    techniqueCoverage,
    promotion: { passed: failures.length === 0, failures },
  };
}

export function comparePuzzleSolveBenchmarkReports(input: {
  candidate: PuzzleSolveBenchmarkReport;
  baseline?: PuzzleSolveBenchmarkReport;
}): { passed: boolean; failures: string[] } {
  const failures = [...input.candidate.promotion.failures];
  if (input.baseline) {
    if (input.candidate.version !== input.baseline.version) {
      failures.push(
        `Baseline version ${input.baseline.version} is incompatible with candidate ${input.candidate.version}`
      );
      return { passed: false, failures: Array.from(new Set(failures)) };
    }
    if (input.candidate.targetDetectionRate < input.baseline.targetDetectionRate - 0.01) {
      failures.push("Puzzle target detection regressed by more than 1 percentage point");
    }
    if (input.candidate.topTargetDetectionRate < input.baseline.topTargetDetectionRate - 0.01) {
      failures.push("Top-answer detection regressed by more than 1 percentage point");
    }
    if (
      input.candidate.dominantTargetDetectionRate <
      input.baseline.dominantTargetDetectionRate - 0.01
    ) {
      failures.push("Dominant-answer detection regressed by more than 1 percentage point");
    }
    if (
      input.candidate.compactTargetDetectionRate <
      input.baseline.compactTargetDetectionRate - 0.01
    ) {
      failures.push("Compact puzzle solving regressed by more than 1 percentage point");
    }
    if (input.candidate.ambiguityRate > input.baseline.ambiguityRate + 0.01) {
      failures.push("Puzzle ambiguity increased by more than 1 percentage point");
    }
    const newCritical = input.candidate.criticalFailures.filter(
      (failure) => !input.baseline!.criticalFailures.includes(failure)
    );
    if (newCritical.length) failures.push(`New critical solve failures: ${newCritical.join(", ")}`);
  }
  return { passed: failures.length === 0, failures: Array.from(new Set(failures)) };
}
