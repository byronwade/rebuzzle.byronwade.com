import { type LiveGeneratorCanaryObservation, scoreLiveGeneratorCanary } from "../generator-canary";

const tiers = ["Hard", "Difficult", "Evil", "Impossible"] as const;

function accepted(index: number): LiveGeneratorCanaryObservation {
  return {
    id: `attempt-${index}`,
    targetDifficulty: [5, 6, 7, 8][index % 4]!,
    tierLabel: tiers[index % 4]!,
    status: "accepted",
    durationMs: 10_000 + index,
    answer: `answer ${index}`,
    answerKey: `answer${index}`,
    fingerprint: `fingerprint-${index}`,
    techniqueId: `technique-${index % 4}`,
    qualityScore: 84,
    funScore: 76,
    uniquenessScore: 90,
    assetSources: [index % 2 ? "approved-cache" : "catalog"],
    boardProfileCount: 3,
    boardDistinctModels: 2,
    blindProfileCount: 3,
    blindCompleteProfileCount: 3,
    editorialProfileCount: 3,
    editorialAcceptedProfiles: 3,
    renderedProfileCount: 3,
  };
}

describe("scoreLiveGeneratorCanary", () => {
  it("promotes a diverse, fully evidenced eight-attempt canary", () => {
    const report = scoreLiveGeneratorCanary(
      Array.from({ length: 8 }, (_, index) => accepted(index))
    );

    expect(report.promotion).toEqual({ passed: true, failures: [] });
    expect(report.acceptanceYield).toBe(1);
    expect(report.evidenceCompleteRate).toBe(1);
    expect(report.approvedAssetRate).toBe(1);
  });

  it("fails partial runs and accepted puzzles with unapproved or missing evidence", () => {
    const unapproved = accepted(0);
    unapproved.assetSources = ["generated"];
    unapproved.blindCompleteProfileCount = 2;
    const report = scoreLiveGeneratorCanary([unapproved]);

    expect(report.promotion.passed).toBe(false);
    expect(report.promotion.failures.join(" ")).toContain("required live attempts");
    expect(report.promotion.failures.join(" ")).toContain("unapproved asset");
    expect(report.promotion.failures.join(" ")).toContain("evaluation evidence");
  });

  it("never promotes fixture archive evidence", () => {
    const report = scoreLiveGeneratorCanary(
      Array.from({ length: 8 }, (_, index) => accepted(index)),
      { archiveMode: "fixture" }
    );

    expect(report.promotion.passed).toBe(false);
    expect(report.promotion.failures).toContain(
      "Archive mode is fixture; live novelty evidence is required for promotion"
    );
  });

  it("classifies rejection reasons for operational diagnosis", () => {
    const report = scoreLiveGeneratorCanary([
      {
        ...accepted(0),
        status: "rejected",
        assetSources: [],
        error: "Pictogram lighthouse is pending human approval",
      },
      {
        ...accepted(1),
        status: "rejected",
        assetSources: [],
        error: "Blind solve tournament rejected candidate",
      },
    ]);

    expect(report.rejectionReasons).toEqual({
      asset_pending_human_review: 1,
      blind_solve: 1,
    });
    expect(report.promotion.failures.join(" ")).not.toContain("unapproved asset");
    expect(report.promotion.failures.join(" ")).not.toContain("evaluation evidence");
  });
});
