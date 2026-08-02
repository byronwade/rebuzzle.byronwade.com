import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "../../visual/presentation";
import { buildPuzzleSolveBenchmarkCorpus } from "../puzzle-corpus";
import { comparePuzzleSolveBenchmarkReports, scorePuzzleSolveBenchmark } from "../puzzle-score";
import type { PuzzleSolveBenchmarkObservation } from "../types";

function perfectObservations(): PuzzleSolveBenchmarkObservation[] {
  return buildPuzzleSolveBenchmarkCorpus().flatMap((entry) =>
    PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => ({
      caseId: entry.id,
      profileId: profile.id,
      targetFoundBy: 2,
      topTargetFoundBy: 2,
      dominantTargetFoundBy: 2,
      judgeCount: 2,
      targetConfidence: 0.9,
      strongestWrongConfidence: 0.2,
      meanReciprocalRank: 1,
      wrongParses: [],
    }))
  );
}

describe("whole-puzzle solve benchmark", () => {
  it("ships a frozen, diverse editorial corpus across every production profile", () => {
    const corpus = buildPuzzleSolveBenchmarkCorpus();
    expect(corpus).toHaveLength(24);
    expect(new Set(corpus.map((entry) => entry.id)).size).toBe(corpus.length);
    expect(new Set(corpus.map((entry) => entry.techniqueId)).size).toBeGreaterThanOrEqual(8);
    expect(corpus.every((entry) => entry.visual.layers.length > 0)).toBe(true);
    expect(corpus.length * PUZZLE_BOARD_RECOGNITION_PROFILES.length).toBe(72);
  });

  it("promotes complete multi-profile solve evidence", () => {
    const corpus = buildPuzzleSolveBenchmarkCorpus();
    const report = scorePuzzleSolveBenchmark({
      cases: corpus,
      observations: perfectObservations(),
    });
    expect(report.coverage).toBe(1);
    expect(report.targetDetectionRate).toBe(1);
    expect(report.topTargetDetectionRate).toBe(1);
    expect(report.dominantTargetDetectionRate).toBe(1);
    expect(report.ambiguityRate).toBe(0);
    expect(report.independentJudgeCoverage).toBe(1);
    expect(report.promotion.passed).toBe(true);
  });

  it("fails closed on missing compact evidence", () => {
    const corpus = buildPuzzleSolveBenchmarkCorpus();
    const observations = perfectObservations().filter(
      (observation) => observation.profileId !== "compact-320"
    );
    const report = scorePuzzleSolveBenchmark({ cases: corpus, observations });
    expect(report.promotion.passed).toBe(false);
    expect(report.coverage).toBeCloseTo(2 / 3);
    expect(report.promotion.failures.join(" ")).toContain("Compact target detection");
  });

  it("blocks new critical solve regressions", () => {
    const corpus = buildPuzzleSolveBenchmarkCorpus();
    const baseline = scorePuzzleSolveBenchmark({
      cases: corpus,
      observations: perfectObservations(),
    });
    const observations = perfectObservations();
    const critical = corpus.find((entry) => entry.critical)!;
    const index = observations.findIndex(
      (observation) => observation.caseId === critical.id && observation.profileId === "compact-320"
    );
    observations[index] = {
      ...observations[index]!,
      targetFoundBy: 0,
      topTargetFoundBy: 0,
      dominantTargetFoundBy: 0,
      targetConfidence: 0,
      meanReciprocalRank: 0,
    };
    const candidate = scorePuzzleSolveBenchmark({ cases: corpus, observations });
    const comparison = comparePuzzleSolveBenchmarkReports({ candidate, baseline });
    expect(comparison.passed).toBe(false);
    expect(comparison.failures.join(" ")).toContain("critical");
  });

  it("rejects baselines produced under an incompatible scoring contract", () => {
    const corpus = buildPuzzleSolveBenchmarkCorpus();
    const candidate = scorePuzzleSolveBenchmark({
      cases: corpus,
      observations: perfectObservations(),
    });
    const baseline = { ...candidate, version: "legacy-rankless-report" };
    const comparison = comparePuzzleSolveBenchmarkReports({ candidate, baseline });
    expect(comparison.passed).toBe(false);
    expect(comparison.failures.join(" ")).toContain("incompatible");
  });

  it("rejects an evaluator that merely includes the answer below a stronger alternate", () => {
    const corpus = buildPuzzleSolveBenchmarkCorpus();
    const observations = perfectObservations().map((observation) => ({
      ...observation,
      targetFoundBy: 2,
      topTargetFoundBy: 0,
      dominantTargetFoundBy: 0,
      targetConfidence: 0,
      strongestWrongConfidence: 0.9,
      meanReciprocalRank: 0.5,
      wrongParses: ["more plausible alternate"],
    }));
    const report = scorePuzzleSolveBenchmark({ cases: corpus, observations });
    expect(report.targetDetectionRate).toBe(1);
    expect(report.topTargetDetectionRate).toBe(0);
    expect(report.ambiguityRate).toBe(1);
    expect(report.promotion.passed).toBe(false);
    expect(report.promotion.failures.join(" ")).toContain("Top-answer");
  });

  it("does not count a one-of-two judge solve as profile success", () => {
    const corpus = buildPuzzleSolveBenchmarkCorpus();
    const observations = perfectObservations().map((observation) => ({
      ...observation,
      targetFoundBy: 1,
      topTargetFoundBy: 1,
      dominantTargetFoundBy: 1,
    }));
    const report = scorePuzzleSolveBenchmark({ cases: corpus, observations });

    expect(report.independentJudgeCoverage).toBe(1);
    expect(report.targetDetectionRate).toBe(0);
    expect(report.topTargetDetectionRate).toBe(0);
    expect(report.dominantTargetDetectionRate).toBe(0);
    expect(report.promotion.passed).toBe(false);
  });
});
