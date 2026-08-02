import { ONE_SIDED_95_Z, wilsonScoreInterval } from "../binomial";

describe("binomial evidence", () => {
  it("returns bounded uncertainty instead of certainty when evidence is absent", () => {
    expect(wilsonScoreInterval(0, 0, ONE_SIDED_95_Z)).toEqual({
      rate: 0,
      lower: 0,
      upper: 1,
      events: 0,
      total: 0,
    });
  });

  it("supports conservative one-sided acceptance bounds", () => {
    const perfectCandidates = wilsonScoreInterval(100, 100, ONE_SIDED_95_Z);
    const noVisualFailures = wilsonScoreInterval(0, 1500, ONE_SIDED_95_Z);

    expect(perfectCandidates.lower).toBeGreaterThan(0.97);
    expect(perfectCandidates.lower).toBeLessThan(1);
    expect(noVisualFailures.upper).toBeLessThan(0.002);
    expect(noVisualFailures.upper).toBeGreaterThan(0);
  });

  it("clamps malformed counts and invalid critical values", () => {
    expect(wilsonScoreInterval(20, 5)).toMatchObject({ events: 5, total: 5, rate: 1 });
    expect(wilsonScoreInterval(Number.NaN, Number.POSITIVE_INFINITY)).toMatchObject({
      events: 0,
      total: 0,
    });
    expect(wilsonScoreInterval(4, 10, Number.NaN)).toEqual(wilsonScoreInterval(4, 10));
  });
});
