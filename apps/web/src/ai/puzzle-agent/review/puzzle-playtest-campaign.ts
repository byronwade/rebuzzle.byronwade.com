import type { PuzzlePlaytestReport } from "./puzzle-playtest-service";

export const PUZZLE_PLAYTEST_RELEASE_SAMPLE = 30;
export const PUZZLE_PLAYTEST_RELEASE_MIN_REVIEWERS = 20;

type CampaignReport = Pick<
  PuzzlePlaytestReport,
  "completedCandidates" | "requiredReviewersPerProfile" | "profileScores" | "reviewerQuality"
>;

export function getPuzzlePlaytestCampaignProgress(report: CampaignReport) {
  return {
    completedCandidates: {
      current: report.completedCandidates,
      target: PUZZLE_PLAYTEST_RELEASE_SAMPLE,
    },
    qualifiedGeneratedDecisions: {
      current: report.reviewerQuality.qualifiedGeneratedDecisions,
      target:
        PUZZLE_PLAYTEST_RELEASE_SAMPLE *
        report.requiredReviewersPerProfile *
        report.profileScores.length,
    },
    qualifiedReviewers: {
      current: report.reviewerQuality.qualifiedReviewers,
      target: PUZZLE_PLAYTEST_RELEASE_MIN_REVIEWERS,
    },
  };
}
