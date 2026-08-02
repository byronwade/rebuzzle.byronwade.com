import type { EditorialFailureKind } from "../visual/editorial-consensus";

export const PUZZLE_GENERATOR_BENCHMARK_VERSION = "2026-08-02.7";
export const ICON_BENCHMARK_TILE_SIZES = [36, 72] as const;

export type IconBenchmarkExpectation = "accept" | "reject";

export type IconBenchmarkCase = {
  id: string;
  group: "catalog-positive" | "semantic-negative";
  expected: IconBenchmarkExpectation;
  intendedConcept: string;
  renderedConcept: string;
  svg: string;
  critical: boolean;
};

export type IconBenchmarkObservation = {
  caseId: string;
  tileSize: number;
  expected: IconBenchmarkExpectation;
  accepted: boolean;
  confidence: number;
  judgeCount: number;
  seenAs: string;
  error?: string;
};

export type BenchmarkSlice = {
  total: number;
  passed: number;
  rate: number;
};

export type IconBenchmarkReport = {
  version: string;
  expectedObservations: number;
  observed: number;
  coverage: number;
  positiveRecall: number;
  negativeRecall: number;
  falseAcceptRate: number;
  falseRejectRate: number;
  balancedAccuracy: number;
  compactPositiveRecall: number;
  largePositiveRecall: number;
  independentJudgeCoverage: number;
  criticalFailures: string[];
  missingObservations: string[];
  slices: Record<string, BenchmarkSlice>;
  promotion: {
    passed: boolean;
    failures: string[];
  };
};

export type PuzzleSolveBenchmarkCase = {
  id: string;
  answer: string;
  techniqueId: string;
  tierLabel: "Hard" | "Difficult" | "Evil" | "Impossible";
  visual: import("../visual/composition").PuzzleVisual;
  critical: boolean;
};

export type PuzzleSolveBenchmarkObservation = {
  caseId: string;
  profileId: string;
  /** Intended answer appeared anywhere in each judge's ranked list. */
  targetFoundBy: number;
  /** Intended answer was the highest-confidence hypothesis. */
  topTargetFoundBy: number;
  /** Intended answer led the strongest alternate by at least 5 points. */
  dominantTargetFoundBy: number;
  judgeCount: number;
  targetConfidence: number;
  strongestWrongConfidence: number;
  meanReciprocalRank: number;
  wrongParses: string[];
};

export type PuzzleSolveBenchmarkReport = {
  version: string;
  expectedObservations: number;
  observed: number;
  coverage: number;
  targetDetectionRate: number;
  topTargetDetectionRate: number;
  dominantTargetDetectionRate: number;
  compactTargetDetectionRate: number;
  compactTopTargetDetectionRate: number;
  meanReciprocalRank: number;
  ambiguityRate: number;
  independentJudgeCoverage: number;
  criticalFailures: string[];
  missingObservations: string[];
  techniqueCoverage: number;
  promotion: { passed: boolean; failures: string[] };
};

export { EDITORIAL_FAILURE_KINDS as PUZZLE_EDITORIAL_FAILURE_KINDS } from "../visual/editorial-consensus";
export type PuzzleEditorialFailureKind = EditorialFailureKind;

export type PuzzleEditorialBenchmarkCase = {
  id: string;
  answer: string;
  techniqueId: string;
  visual: import("../visual/composition").PuzzleVisual;
  expected: "publish" | "reject";
  failureKinds: PuzzleEditorialFailureKind[];
  critical: boolean;
};

export type PuzzleEditorialBenchmarkObservation = {
  caseId: string;
  profileId: string;
  judgeCount: number;
  publishVotes: number;
  rejectVotes: number;
  detectedFailureKinds: PuzzleEditorialFailureKind[];
  answerLeakVotes: number;
};

export type PuzzleEditorialBenchmarkReport = {
  version: string;
  expectedObservations: number;
  observed: number;
  coverage: number;
  independentJudgeCoverage: number;
  positiveAcceptanceRate: number;
  failureDetectionRate: number;
  failureConsensusRate: number;
  compactFailureDetectionRate: number;
  failureKindCoverage: number;
  criticalFailures: string[];
  missingObservations: string[];
  slices: Record<string, BenchmarkSlice>;
  automatedGate: { passed: boolean; failures: string[] };
  marketReadiness: {
    passed: boolean;
    positiveCases: number;
    negativeCases: number;
    techniqueCoverage: number;
    failures: string[];
  };
  promotion: { passed: boolean; failures: string[] };
};

export type PuzzleQualityBenchmarkReport = {
  version: string;
  solve: PuzzleSolveBenchmarkReport;
  editorial: PuzzleEditorialBenchmarkReport;
  promotion: { passed: boolean; failures: string[] };
};
