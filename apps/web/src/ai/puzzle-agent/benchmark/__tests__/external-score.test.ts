import type { ExternalPuzzleFixture } from "../external-corpus";
import {
  compareExternalPuzzleBenchmarkReports,
  type ExternalPuzzleBenchmarkObservation,
  scoreExternalPuzzleBenchmark,
} from "../external-score";

const FEATURES = [
  "spelling",
  "color",
  "position",
  "orientation",
  "aspect_ratio",
  "size",
  "style_texture",
  "number",
] as const;

function cases(): ExternalPuzzleFixture[] {
  return Array.from({ length: 100 }, (_, index) => ({
    id: `case-${index}`,
    datasetId: "re-bus-hf-v1",
    datasetRow: index + 2,
    imageUrl: `https://raw.githubusercontent.com/a/b/main/${index}.png`,
    sourceUrl: `https://source-${index % 3}.example.com/puzzle`,
    answer: `answer ${index}`,
    difficulty: ["EASY", "MEDIUM", "HARD"][index % 3]!,
    reasoningFeatures: [...FEATURES],
    isAugmented: false,
    reviewStatus: "approved",
    eligibleForEvaluation: true,
  }));
}

function observations(entries = cases()): ExternalPuzzleBenchmarkObservation[] {
  return entries.map((entry) => ({
    caseId: entry.id,
    targetFoundBy: 2,
    topTargetFoundBy: 2,
    dominantTargetFoundBy: 2,
    judgeCount: 2,
    targetConfidence: 0.9,
    strongestWrongConfidence: 0.1,
    meanReciprocalRank: 1,
    wrongParses: [],
  }));
}

describe("external blind-solve benchmark", () => {
  it("passes only a complete, diverse, independently judged corpus", () => {
    const report = scoreExternalPuzzleBenchmark({
      cases: cases(),
      observations: observations(),
      revision: "revision-1",
    });
    expect(report.promotion.passed).toBe(true);
    expect(report.coverage).toBe(1);
    expect(report.topTargetDetectionRate).toBe(1);
    expect(report.slices.reasoningFeatures.position.total).toBe(100);
  });

  it("fails closed on unapproved, augmented, missing, or single-judge evidence", () => {
    const entries = cases();
    entries[0] = { ...entries[0]!, isAugmented: true, eligibleForEvaluation: false };
    const partial = observations(entries)
      .slice(1)
      .map((entry) => ({ ...entry, judgeCount: 1 }));
    const report = scoreExternalPuzzleBenchmark({
      cases: entries,
      observations: partial,
      revision: "revision-1",
    });
    expect(report.promotion.passed).toBe(false);
    expect(report.coverage).toBe(0.99);
    expect(report.independentJudgeCoverage).toBe(0);
    expect(report.promotion.failures.join(" ")).toContain("unapproved or augmented");
  });

  it("rejects evaluator regressions and incompatible baselines", () => {
    const entries = cases();
    const baseline = scoreExternalPuzzleBenchmark({
      cases: entries,
      observations: observations(entries),
      revision: "revision-1",
    });
    const degradedObservations = observations(entries).map((entry, index) =>
      index < 2
        ? {
            ...entry,
            topTargetFoundBy: 0,
            dominantTargetFoundBy: 0,
            meanReciprocalRank: 0.5,
          }
        : entry
    );
    const degraded = scoreExternalPuzzleBenchmark({
      cases: entries,
      observations: degradedObservations,
      revision: "revision-1",
    });
    expect(
      compareExternalPuzzleBenchmarkReports({ candidate: degraded, baseline }).failures.join(" ")
    ).toContain("regressed");
    expect(
      compareExternalPuzzleBenchmarkReports({
        candidate: { ...baseline, revision: "revision-2" },
        baseline,
      }).failures.join(" ")
    ).toContain("incompatible");
  });

  it("does not award external success from a single agreeing judge", () => {
    const entries = cases();
    const splitJudgeObservations = observations(entries).map((entry) => ({
      ...entry,
      targetFoundBy: 1,
      topTargetFoundBy: 1,
      dominantTargetFoundBy: 1,
    }));
    const report = scoreExternalPuzzleBenchmark({
      cases: entries,
      observations: splitJudgeObservations,
      revision: "revision-1",
    });

    expect(report.independentJudgeCoverage).toBe(1);
    expect(report.targetDetectionRate).toBe(0);
    expect(report.topTargetDetectionRate).toBe(0);
    expect(report.dominantTargetDetectionRate).toBe(0);
    expect(report.promotion.passed).toBe(false);
  });
});
