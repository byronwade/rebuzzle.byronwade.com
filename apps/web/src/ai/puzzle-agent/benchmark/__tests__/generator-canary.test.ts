import type { PuzzleVisual } from "../../visual/composition";
import {
  countCompleteBoardCueProfiles,
  countDeclaredBoardCues,
  hasCompleteBoardCueEvidence,
  type LiveGeneratorCanaryObservation,
  scoreLiveGeneratorCanary,
} from "../generator-canary";

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
    boardDeclaredCueCount: 4,
    boardProfileCount: 3,
    boardCompleteProfileCount: 3,
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

  it("does not accept profile counts as proof of complete per-profile cue evidence", () => {
    const partial = accepted(0);
    partial.boardCompleteProfileCount = 2;
    const report = scoreLiveGeneratorCanary([
      partial,
      ...Array.from({ length: 7 }, (_, index) => accepted(index + 1)),
    ]);

    expect(report.evidenceCompleteRate).toBe(7 / 8);
    expect(report.promotion.failures).toContain(
      "At least one accepted puzzle lacks complete rendered evaluation evidence"
    );
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

describe("hasCompleteBoardCueEvidence", () => {
  const visual: PuzzleVisual = {
    styleId: "ink-pictogram-v1",
    mode: "composed",
    layout: "row",
    unicodeFallback: "🚗 + GO GO",
    layers: [
      { kind: "pictogram", concept: "car", emojiFallback: "🚗" },
      { kind: "operator", symbol: "+" },
      { kind: "text", content: "GO", emphasis: "normal" },
      { kind: "text", content: "GO", emphasis: "normal" },
    ],
  };
  const completeProfile = {
    profileId: "compact-320",
    models: ["vision-a", "vision-b"],
    conceptVotes: { car: 2 },
    textVotes: { GO: 2 },
    operatorVotes: { "+": 2 },
  };

  it("requires two distinct judges and quorum for every declared cue", () => {
    expect(hasCompleteBoardCueEvidence({ visual, profile: completeProfile })).toBe(true);
    expect(
      hasCompleteBoardCueEvidence({
        visual,
        profile: { ...completeProfile, models: ["vision-a", "VISION-A"] },
      })
    ).toBe(false);
    expect(
      hasCompleteBoardCueEvidence({
        visual,
        profile: { ...completeProfile, textVotes: { GO: 1 } },
      })
    ).toBe(false);
    expect(
      hasCompleteBoardCueEvidence({
        visual,
        profile: { ...completeProfile, operatorVotes: {} },
      })
    ).toBe(false);
    expect(
      hasCompleteBoardCueEvidence({
        visual,
        profile: {
          profileId: "compact-320",
          models: ["vision-a", "vision-b"],
          conceptVotes: { car: 2 },
        },
      })
    ).toBe(false);
  });

  it("requires persisted concept votes for generated image subjects", () => {
    const imageVisual: PuzzleVisual = {
      ...visual,
      mode: "hybrid",
      layers: [
        {
          kind: "image",
          concept: "car",
          prompt: "one red car on a plain background",
          alt: "red car",
          src: "data:image/png;base64,AAAA",
        },
      ],
      unicodeFallback: "🖼️",
    };

    expect(hasCompleteBoardCueEvidence({ visual: imageVisual, profile: completeProfile })).toBe(
      true
    );
    expect(countDeclaredBoardCues(imageVisual)).toBe(1);
    expect(
      hasCompleteBoardCueEvidence({
        visual: imageVisual,
        profile: { ...completeProfile, conceptVotes: {} },
      })
    ).toBe(false);
    const legacyImageVisual: PuzzleVisual = {
      ...imageVisual,
      layers: [
        {
          kind: "image",
          prompt: "one red car on a plain background",
          alt: "red car",
          src: "data:image/png;base64,AAAA",
        },
      ],
    };
    expect(
      hasCompleteBoardCueEvidence({ visual: legacyImageVisual, profile: completeProfile })
    ).toBe(false);
    expect(countDeclaredBoardCues(legacyImageVisual)).toBe(1);
  });

  it("counts each exact production profile once and rejects duplicate substitutes", () => {
    const profiles = [
      completeProfile,
      { ...completeProfile, profileId: "mobile-375" },
      { ...completeProfile, profileId: "desktop-768" },
    ];

    expect(countCompleteBoardCueProfiles({ visual, profiles })).toBe(3);
    expect(
      countCompleteBoardCueProfiles({
        visual,
        profiles: [profiles[0]!, profiles[0]!, profiles[2]!],
      })
    ).toBe(1);
    expect(
      countCompleteBoardCueProfiles({
        visual,
        profiles: [...profiles, { ...completeProfile, profileId: "tablet-500" }],
      })
    ).toBe(3);
  });
});
