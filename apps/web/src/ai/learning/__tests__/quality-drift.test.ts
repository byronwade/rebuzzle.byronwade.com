import { assessQualityDrift, type QualityDriftWindow, wilsonInterval } from "../quality-drift";

function window(overrides: Partial<QualityDriftWindow> = {}): QualityDriftWindow {
  return {
    days: 7,
    qualityVotes: 0,
    dislikes: 0,
    unrecognizableReports: 0,
    ambiguityOrUnfairReports: 0,
    finalPlays: 0,
    solves: 0,
    abandons: 0,
    generationAttempts: 0,
    generationFailuresOrFallbacks: 0,
    ...overrides,
  };
}

describe("quality drift circuit breaker", () => {
  it("returns a bounded Wilson interval without inventing certainty for no data", () => {
    expect(wilsonInterval(0, 0)).toEqual({
      rate: 0,
      lower: 0,
      upper: 1,
      events: 0,
      total: 0,
    });

    const observed = wilsonInterval(4, 10);
    expect(observed.rate).toBe(0.4);
    expect(observed.lower).toBeGreaterThan(0);
    expect(observed.upper).toBeLessThan(1);
  });

  it("does not halt when production evidence is absent", () => {
    const report = assessQualityDrift({
      fastWindow: window(),
      slowWindow: window({ days: 28 }),
      now: new Date("2026-08-01T12:00:00.000Z"),
    });

    expect(report.status).toBe("insufficient");
    expect(report.shouldUseReserve).toBe(false);
    expect(report.generatedAt).toBe("2026-08-01T12:00:00.000Z");
  });

  it("stays healthy with enough clean player and generation outcomes", () => {
    const report = assessQualityDrift({
      fastWindow: window({ qualityVotes: 40, generationAttempts: 7 }),
      slowWindow: window({ days: 28, qualityVotes: 100, generationAttempts: 28 }),
    });

    expect(report.status).toBe("healthy");
    expect(report.metrics.every((metric) => metric.status === "healthy")).toBe(true);
    expect(report.shouldUseReserve).toBe(false);
  });

  it("does not trip on one sparse unrecognizable report", () => {
    const report = assessQualityDrift({
      fastWindow: window({ qualityVotes: 10, unrecognizableReports: 1 }),
      slowWindow: window({ days: 28, qualityVotes: 10, unrecognizableReports: 1 }),
    });

    expect(report.status).toBe("insufficient");
    expect(report.shouldUseReserve).toBe(false);
  });

  it("halts only after a high-burn unrecognizable breach is confirmed in both windows", () => {
    const report = assessQualityDrift({
      fastWindow: window({ qualityVotes: 40, unrecognizableReports: 4 }),
      slowWindow: window({ days: 28, qualityVotes: 100, unrecognizableReports: 8 }),
    });
    const metric = report.metrics.find((candidate) => candidate.id === "unrecognizable");

    expect(metric?.status).toBe("critical");
    expect(metric?.fast.lower).toBeGreaterThan(metric?.targetRate ?? 1);
    expect(metric?.slow.lower).toBeGreaterThan(metric?.targetRate ?? 1);
    expect(report.status).toBe("halt");
    expect(report.shouldUseReserve).toBe(true);
  });

  it("marks a slow-only fairness breach degraded without switching to reserve", () => {
    const report = assessQualityDrift({
      fastWindow: window({ qualityVotes: 20 }),
      slowWindow: window({
        days: 28,
        qualityVotes: 100,
        ambiguityOrUnfairReports: 8,
      }),
    });
    const metric = report.metrics.find((candidate) => candidate.id === "ambiguous_or_unfair");

    expect(metric?.status).toBe("degraded");
    expect(report.status).toBe("degraded");
    expect(report.shouldUseReserve).toBe(false);
  });

  it("uses daily-cadence thresholds for a confirmed generation outage", () => {
    const report = assessQualityDrift({
      fastWindow: window({ generationAttempts: 5, generationFailuresOrFallbacks: 2 }),
      slowWindow: window({
        days: 28,
        generationAttempts: 14,
        generationFailuresOrFallbacks: 4,
      }),
    });
    const metric = report.metrics.find((candidate) => candidate.id === "generation_failure");

    expect(metric?.status).toBe("critical");
    expect(report.shouldUseReserve).toBe(true);
  });

  it("can halt on sustained severe dislike without conflating a normal dislike rate", () => {
    const report = assessQualityDrift({
      fastWindow: window({ qualityVotes: 40, dislikes: 34 }),
      slowWindow: window({ days: 28, qualityVotes: 100, dislikes: 60 }),
    });
    const metric = report.metrics.find((candidate) => candidate.id === "dislike");

    expect(metric?.status).toBe("critical");
    expect(report.shouldUseReserve).toBe(true);
  });

  it("clamps malformed counters instead of producing invalid rates", () => {
    expect(wilsonInterval(-4, -10)).toEqual({
      rate: 0,
      lower: 0,
      upper: 1,
      events: 0,
      total: 0,
    });
    expect(wilsonInterval(20, 5)).toMatchObject({ events: 5, total: 5, rate: 1 });
    expect(wilsonInterval(Number.NaN, Number.POSITIVE_INFINITY)).toMatchObject({
      events: 0,
      total: 0,
    });
  });

  it("recovers automatically after the confirmed breach ages out", () => {
    const critical = assessQualityDrift({
      fastWindow: window({ qualityVotes: 40, unrecognizableReports: 4 }),
      slowWindow: window({ days: 28, qualityVotes: 100, unrecognizableReports: 8 }),
    });
    const recovered = assessQualityDrift({
      fastWindow: window({ qualityVotes: 40, generationAttempts: 7 }),
      slowWindow: window({ days: 28, qualityVotes: 100, generationAttempts: 28 }),
    });

    expect(critical.shouldUseReserve).toBe(true);
    expect(recovered.status).toBe("healthy");
    expect(recovered.shouldUseReserve).toBe(false);
  });
});
