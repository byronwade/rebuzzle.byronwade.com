import {
  progressiveHintPublishBlockers,
  shouldRunProgressiveHintVision,
} from "../progressive-hint-vision";
import type { PlayerSimResult } from "../types";

describe("progressive-hint vision gating", () => {
  it("skips hinted spend when blind dominance already passed", () => {
    expect(
      shouldRunProgressiveHintVision({
        profilesWithDominantTarget: 3,
        profileCount: 3,
        topTargetFoundBy: 6,
        requiredVotes: 2,
      })
    ).toBe(false);
  });

  it("runs hinted unlock check when blind dominance failed", () => {
    expect(
      shouldRunProgressiveHintVision({
        profilesWithDominantTarget: 1,
        profileCount: 3,
        topTargetFoundBy: 2,
        requiredVotes: 2,
      })
    ).toBe(true);
  });

  it("publishes a clear blocker when progressive hints fail to unlock", () => {
    const sim = {
      hintedAttempted: true,
      hintedUnlocksVisualSolve: false,
    } as PlayerSimResult;
    expect(progressiveHintPublishBlockers(sim).join(" ")).toMatch(
      /Progressive-hint vision failed/i
    );
  });
});
