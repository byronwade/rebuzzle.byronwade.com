import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "../../visual/presentation";
import {
  comparePuzzleEditorialBenchmarkReports,
  scorePuzzleEditorialBenchmark,
} from "../editorial-score";
import {
  buildPuzzleEditorialBenchmarkCorpus,
  buildPuzzleFailureBenchmarkCorpus,
} from "../failure-corpus";
import { buildPuzzleSolveBenchmarkCorpus } from "../puzzle-corpus";
import {
  comparePuzzleQualityBenchmarkReports,
  scorePuzzleQualityBenchmark,
} from "../quality-score";
import {
  PUZZLE_EDITORIAL_FAILURE_KINDS,
  type PuzzleEditorialBenchmarkObservation,
  type PuzzleSolveBenchmarkObservation,
} from "../types";

function perfectObservations(): PuzzleEditorialBenchmarkObservation[] {
  return buildPuzzleEditorialBenchmarkCorpus().flatMap((entry) =>
    PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => ({
      caseId: entry.id,
      profileId: profile.id,
      judgeCount: 2,
      publishVotes: entry.expected === "publish" ? 2 : 0,
      rejectVotes: entry.expected === "reject" ? 2 : 0,
      detectedFailureKinds: entry.failureKinds,
      answerLeakVotes: entry.failureKinds.includes("answer_leak") ? 2 : 0,
    }))
  );
}

function perfectSolveObservations(): PuzzleSolveBenchmarkObservation[] {
  return buildPuzzleSolveBenchmarkCorpus().flatMap((entry) =>
    PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => ({
      caseId: entry.id,
      profileId: profile.id,
      targetFoundBy: 2,
      topTargetFoundBy: 2,
      dominantTargetFoundBy: 2,
      judgeCount: 2,
      targetConfidence: 0.9,
      strongestWrongConfidence: 0.1,
      meanReciprocalRank: 1,
      wrongParses: [],
    }))
  );
}

describe("paired editorial quality benchmark", () => {
  it("ships paired good and deliberately broken boards across every failure kind", () => {
    const corpus = buildPuzzleEditorialBenchmarkCorpus();
    const failures = buildPuzzleFailureBenchmarkCorpus();
    expect(corpus.filter((entry) => entry.expected === "publish")).toHaveLength(24);
    expect(failures).toHaveLength(12);
    expect(new Set(corpus.map((entry) => entry.id)).size).toBe(corpus.length);
    expect(new Set(failures.flatMap((entry) => entry.failureKinds))).toEqual(
      new Set(PUZZLE_EDITORIAL_FAILURE_KINDS)
    );
  });

  it("separates an automated green gate from an underfilled market corpus", () => {
    const corpus = buildPuzzleEditorialBenchmarkCorpus();
    const report = scorePuzzleEditorialBenchmark({
      cases: corpus,
      observations: perfectObservations(),
    });
    expect(report.automatedGate.passed).toBe(true);
    expect(report.positiveAcceptanceRate).toBe(1);
    expect(report.failureDetectionRate).toBe(1);
    expect(report.failureKindCoverage).toBe(1);
    expect(report.marketReadiness.passed).toBe(false);
    expect(report.promotion.passed).toBe(false);
    expect(report.marketReadiness.failures.join(" ")).toContain("24/150");
    expect(report.marketReadiness.failures.join(" ")).toContain("12/100");
  });

  it("prevents a reject-everything evaluator from passing", () => {
    const corpus = buildPuzzleEditorialBenchmarkCorpus();
    const observations = perfectObservations().map((entry) => ({
      ...entry,
      publishVotes: 0,
      rejectVotes: 2,
    }));
    const report = scorePuzzleEditorialBenchmark({ cases: corpus, observations });
    expect(report.failureDetectionRate).toBe(1);
    expect(report.positiveAcceptanceRate).toBe(0);
    expect(report.automatedGate.passed).toBe(false);
    expect(report.automatedGate.failures.join(" ")).toContain("Good-puzzle acceptance");
  });

  it("prevents an approve-everything evaluator from passing", () => {
    const corpus = buildPuzzleEditorialBenchmarkCorpus();
    const observations = perfectObservations().map((entry) => ({
      ...entry,
      publishVotes: 2,
      rejectVotes: 0,
      detectedFailureKinds: [],
    }));
    const report = scorePuzzleEditorialBenchmark({ cases: corpus, observations });
    expect(report.positiveAcceptanceRate).toBe(1);
    expect(report.failureDetectionRate).toBe(0);
    expect(report.automatedGate.passed).toBe(false);
    expect(report.automatedGate.failures.join(" ")).toContain("Known-failure detection");
  });

  it("fails closed on missing responsive evidence and baseline regressions", () => {
    const corpus = buildPuzzleEditorialBenchmarkCorpus();
    const baseline = scorePuzzleEditorialBenchmark({
      cases: corpus,
      observations: perfectObservations(),
    });
    const observations = perfectObservations().filter((entry) => entry.profileId !== "compact-320");
    const candidate = scorePuzzleEditorialBenchmark({ cases: corpus, observations });
    const comparison = comparePuzzleEditorialBenchmarkReports({ candidate, baseline });
    expect(candidate.coverage).toBeCloseTo(2 / 3);
    expect(candidate.automatedGate.passed).toBe(false);
    expect(comparison.passed).toBe(false);
    expect(comparison.failures.join(" ")).toContain("Coverage");
  });

  it("exposes one authoritative promotion result for solve and rejection evidence", () => {
    const report = scorePuzzleQualityBenchmark({
      solveCases: buildPuzzleSolveBenchmarkCorpus(),
      solveObservations: perfectSolveObservations(),
      editorialCases: buildPuzzleEditorialBenchmarkCorpus(),
      editorialObservations: perfectObservations(),
    });
    expect(report.solve.promotion.passed).toBe(true);
    expect(report.editorial.automatedGate.passed).toBe(true);
    expect(report.editorial.marketReadiness.passed).toBe(false);
    expect(report.promotion.passed).toBe(false);
    const comparison = comparePuzzleQualityBenchmarkReports({
      candidate: report,
      baseline: report,
    });
    expect(comparison.passed).toBe(false);
    expect(comparison.failures.join(" ")).toContain("Positive editorial corpus");
  });
});
