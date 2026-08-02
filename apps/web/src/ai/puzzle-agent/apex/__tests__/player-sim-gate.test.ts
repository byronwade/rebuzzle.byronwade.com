import { blindSolvePublishBlockers } from "../blind-solve-consensus";
import type { PlayerSimResult } from "../types";

function passingSim(): PlayerSimResult {
  const blindProfileResults = ["compact-320", "mobile-375", "desktop-768"].map((profileId) => ({
    profileId,
    judgeCount: 2,
    targetFoundBy: 2,
    topTargetFoundBy: 2,
    dominantTargetFoundBy: 2,
    meanReciprocalRank: 1,
    strongestWrongConfidence: 0.2,
  }));
  return {
    firstWrongParses: [],
    likelySolvePath: "Visible cue mapping",
    hintUnlockOrderLooksFair: true,
    unfairReasons: [],
    estimatedSolveRate: 0.55,
    confidence: 0.8,
    blindProfileCount: 3,
    blindProfilesWithTarget: 3,
    blindTopTargetFoundBy: 3,
    blindDominantTargetFoundBy: 3,
    blindProfilesWithTopTarget: 3,
    blindProfilesWithDominantTarget: 3,
    blindMeanReciprocalRank: 0.8,
    blindStrongestWrongConfidence: 0.35,
    blindRequiredVotes: 2,
    blindProfileResults,
  };
}

describe("blind solve publication gate", () => {
  it("accepts complete evidence where the intended answer dominates every profile", () => {
    expect(blindSolvePublishBlockers(passingSim())).toEqual([]);
  });

  it("rejects answer mentions that lose to a stronger interpretation", () => {
    const failingProfiles = passingSim().blindProfileResults!.map((profile, index) =>
      index === 0 ? { ...profile, topTargetFoundBy: 1, dominantTargetFoundBy: 0 } : profile
    );
    const sim = {
      ...passingSim(),
      blindProfilesWithTopTarget: 1,
      blindProfilesWithDominantTarget: 0,
      blindStrongestWrongConfidence: 0.94,
      blindProfileResults: failingProfiles,
    };
    const blockers = blindSolvePublishBlockers(sim);
    expect(blockers.join(" ")).toContain("top-rank agreement");
    expect(blockers.join(" ")).toContain("competing answer");
  });

  it("rejects a responsive profile where the answer cannot be reached", () => {
    const failingProfiles = passingSim().blindProfileResults!.map((profile, index) =>
      index === 0
        ? {
            ...profile,
            targetFoundBy: 0,
            topTargetFoundBy: 0,
            dominantTargetFoundBy: 0,
          }
        : profile
    );
    const blockers = blindSolvePublishBlockers({
      ...passingSim(),
      blindProfilesWithTarget: 2,
      blindProfilesWithTopTarget: 2,
      blindProfilesWithDominantTarget: 2,
      blindProfileResults: failingProfiles,
    });
    expect(blockers.join(" ")).toContain("agreement in every");
  });

  it("rejects split judges even when one judge solves every profile", () => {
    const sim = passingSim();
    const splitProfiles = sim.blindProfileResults!.map((profile) => ({
      ...profile,
      targetFoundBy: 1,
      topTargetFoundBy: 1,
      dominantTargetFoundBy: 1,
    }));
    const blockers = blindSolvePublishBlockers({
      ...sim,
      blindProfileResults: splitProfiles,
    });

    expect(blockers.join(" ")).toContain("2-judge agreement");
    expect(blockers.join(" ")).toContain("compact-320");
  });

  it("fails closed when per-profile evidence is absent", () => {
    const blockers = blindSolvePublishBlockers({
      ...passingSim(),
      blindProfileResults: undefined,
    });
    expect(blockers.join(" ")).toContain("missing per-profile consensus evidence");
  });
});
