import { assessHumanCalibrationGate } from "../human-calibration-gate";

describe("human calibration gate", () => {
  it("does not halt when human evidence is still collecting", () => {
    const gate = assessHumanCalibrationGate({
      icon: {
        contractVersion: "human-icon-recognition-v3",
        releaseReady: false,
        coverageRate: 0.4,
        weakFixtureCount: 0,
      },
      playtest: {
        contractVersion: "puzzle-playtest-v3",
        completedCandidates: 8,
        releaseReady: false,
        visualFailureRate: 0.02,
        ambiguityRate: 0.05,
      },
    });
    expect(gate.shouldUseReserve).toBe(false);
    expect(gate.status).toBe("watch");
  });

  it("halts when a fully covered icon panel fails release", () => {
    const gate = assessHumanCalibrationGate({
      icon: {
        contractVersion: "human-icon-recognition-v3",
        releaseReady: false,
        coverageRate: 1,
        weakFixtureCount: 4,
      },
    });
    expect(gate.shouldUseReserve).toBe(true);
    expect(gate.status).toBe("halt");
    expect(gate.reasons.join(" ")).toMatch(/weak specimens/i);
  });

  it("halts when playtest release sample fails quality gates", () => {
    const gate = assessHumanCalibrationGate({
      playtest: {
        contractVersion: "puzzle-playtest-v3",
        completedCandidates: 30,
        releaseReady: false,
        releaseFailures: ["Visual failure rate too high"],
        visualFailureRate: 0.12,
        ambiguityRate: 0.08,
      },
    });
    expect(gate.shouldUseReserve).toBe(true);
    expect(gate.status).toBe("halt");
    expect(gate.reasons[0]).toMatch(/Visual failure/i);
  });

  it("is healthy when complete human cohorts pass release", () => {
    const gate = assessHumanCalibrationGate({
      icon: {
        contractVersion: "human-icon-recognition-v3",
        releaseReady: true,
        coverageRate: 1,
        weakFixtureCount: 0,
      },
      playtest: {
        contractVersion: "puzzle-playtest-v3",
        completedCandidates: 30,
        releaseReady: true,
        visualFailureRate: 0.01,
        ambiguityRate: 0.04,
      },
    });
    expect(gate.shouldUseReserve).toBe(false);
    expect(gate.status).toBe("healthy");
  });

  it("surfaces playtest technique drift as watch without forcing reserve alone", () => {
    const gate = assessHumanCalibrationGate({
      playtest: {
        contractVersion: "puzzle-playtest-v3",
        completedCandidates: 30,
        releaseReady: true,
        visualFailureRate: 0.01,
        ambiguityRate: 0.04,
      },
      techniqueDriftIssues: ["Playtest drift: simple_compound solve rate 92% (players crushing)"],
    });
    expect(gate.shouldUseReserve).toBe(false);
    expect(gate.status).toBe("watch");
    expect(gate.reasons.join(" ")).toMatch(/simple_compound/);
  });
});
