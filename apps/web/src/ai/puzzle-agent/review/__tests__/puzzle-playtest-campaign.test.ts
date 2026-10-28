import { getPuzzlePlaytestCampaignProgress } from "../puzzle-playtest-campaign";

describe("puzzle playtest campaign progress", () => {
  it("counts qualified decisions across every required recognition profile", () => {
    const report = {
      completedCandidates: 12,
      requiredReviewersPerProfile: 5,
      profileScores: [{}, {}, {}, {}],
      reviewerQuality: {
        qualifiedReviewers: 8,
        qualifiedGeneratedDecisions: 237,
      },
    };

    expect(getPuzzlePlaytestCampaignProgress(report)).toEqual({
      completedCandidates: { current: 12, target: 30 },
      qualifiedGeneratedDecisions: { current: 237, target: 600 },
      qualifiedReviewers: { current: 8, target: 20 },
    });
  });

  it("recomputes the decision target when the required profile count changes", () => {
    const report = {
      completedCandidates: 0,
      requiredReviewersPerProfile: 5,
      profileScores: [{}, {}, {}],
      reviewerQuality: {
        qualifiedReviewers: 0,
        qualifiedGeneratedDecisions: 0,
      },
    };

    expect(getPuzzlePlaytestCampaignProgress(report).qualifiedGeneratedDecisions.target).toBe(450);
  });
});
