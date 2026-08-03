import { applySimCalibration, computeSimCalibrationFromPairs } from "../sim-calibration";

describe("sim calibration", () => {
  it("returns empty until enough pairs exist", () => {
    const result = computeSimCalibrationFromPairs([
      { estimated: 0.5, live: 0.7 },
      { estimated: 0.4, live: 0.6 },
    ]);
    expect(result.adjustment).toBe(0);
    expect(result.sampleSize).toBe(2);
  });

  it("raises estimates when sims were too pessimistic", () => {
    const pairs = Array.from({ length: 8 }, () => ({
      estimated: 0.3,
      live: 0.7,
    }));
    const result = computeSimCalibrationFromPairs(pairs);
    expect(result.meanBias).toBeCloseTo(0.4);
    expect(result.adjustment).toBeGreaterThan(0.1);
    expect(result.adjustment).toBeLessThanOrEqual(0.2);
  });

  it("lowers estimates when sims were too optimistic", () => {
    const pairs = Array.from({ length: 10 }, () => ({
      estimated: 0.8,
      live: 0.3,
    }));
    const result = computeSimCalibrationFromPairs(pairs);
    expect(result.adjustment).toBeLessThan(-0.1);
  });

  it("clamps calibrated solve rate into a safe band", () => {
    expect(applySimCalibration(0.9, { adjustment: 0.2 })).toBe(0.95);
    expect(applySimCalibration(0.1, { adjustment: -0.2 })).toBe(0.05);
    expect(applySimCalibration(0.5, { adjustment: 0.1 })).toBeCloseTo(0.6);
  });
});
