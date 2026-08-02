import { buildIconBenchmarkCorpus } from "../corpus";
import { compareIconBenchmarkReports, scoreIconBenchmark } from "../score";
import { ICON_BENCHMARK_TILE_SIZES, type IconBenchmarkObservation } from "../types";

function perfectObservations(): IconBenchmarkObservation[] {
  return buildIconBenchmarkCorpus().flatMap((entry) =>
    ICON_BENCHMARK_TILE_SIZES.map((tileSize) => ({
      caseId: entry.id,
      tileSize,
      expected: entry.expected,
      accepted: entry.expected === "accept",
      confidence: 0.9,
      judgeCount: 2,
      seenAs: entry.renderedConcept,
    }))
  );
}

describe("puzzle generator benchmark", () => {
  it("builds a frozen corpus with more than 200 multi-size decisions", () => {
    const corpus = buildIconBenchmarkCorpus();
    const positives = corpus.filter((entry) => entry.expected === "accept");
    const negatives = corpus.filter((entry) => entry.expected === "reject");

    expect(corpus).toHaveLength(196);
    expect(positives).toHaveLength(98);
    expect(negatives).toHaveLength(98);
    expect(corpus.length * ICON_BENCHMARK_TILE_SIZES.length).toBe(392);
    expect(negatives.every((entry) => entry.intendedConcept !== entry.renderedConcept)).toBe(true);
    expect(new Set(corpus.map((entry) => entry.id)).size).toBe(corpus.length);
  });

  it("promotes only complete, independently judged, high-accuracy results", () => {
    const corpus = buildIconBenchmarkCorpus();
    const report = scoreIconBenchmark({ cases: corpus, observations: perfectObservations() });

    expect(report.expectedObservations).toBe(392);
    expect(report.coverage).toBe(1);
    expect(report.positiveRecall).toBe(1);
    expect(report.negativeRecall).toBe(1);
    expect(report.promotion.passed).toBe(true);
  });

  it("fails closed when one required size is absent", () => {
    const corpus = buildIconBenchmarkCorpus();
    const observations = perfectObservations().filter((observation) => observation.tileSize !== 36);
    const report = scoreIconBenchmark({ cases: corpus, observations });

    expect(report.coverage).toBe(0.5);
    expect(report.promotion.passed).toBe(false);
    expect(report.promotion.failures.join(" ")).toContain("Coverage");
    expect(report.promotion.failures.join(" ")).toContain("Compact recognition");
  });

  it("blocks promotion on a critical common-object false rejection", () => {
    const corpus = buildIconBenchmarkCorpus();
    const observations = perfectObservations();
    const critical = corpus.find(
      (entry) => entry.critical && entry.expected === "accept" && entry.intendedConcept === "car"
    )!;
    const failed = observations.map((observation) =>
      observation.caseId === critical.id && observation.tileSize === 36
        ? { ...observation, accepted: false }
        : observation
    );
    const report = scoreIconBenchmark({ cases: corpus, observations: failed });

    expect(report.promotion.passed).toBe(false);
    expect(report.criticalFailures).toContain(`${critical.id}@36`);
  });

  it("blocks promotion when a judge disappears even if decisions look correct", () => {
    const corpus = buildIconBenchmarkCorpus();
    const observations = perfectObservations();
    observations[0] = { ...observations[0]!, judgeCount: 1 };
    const report = scoreIconBenchmark({ cases: corpus, observations });

    expect(report.promotion.passed).toBe(false);
    expect(report.independentJudgeCoverage).toBeLessThan(1);
  });

  it("blocks an evaluator that materially regresses against the frozen baseline", () => {
    const corpus = buildIconBenchmarkCorpus();
    const baseline = scoreIconBenchmark({ cases: corpus, observations: perfectObservations() });
    const degradedObservations = perfectObservations();
    for (let index = 0; index < 4; index += 1) {
      degradedObservations[index] = { ...degradedObservations[index]!, accepted: false };
    }
    const candidate = scoreIconBenchmark({ cases: corpus, observations: degradedObservations });
    const comparison = compareIconBenchmarkReports({ candidate, baseline });

    expect(comparison.passed).toBe(false);
    expect(comparison.failures.join(" ")).toContain("regressed");
  });
});
