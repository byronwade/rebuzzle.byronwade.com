const measureWindowPerformance = jest.fn();
const loadQualityVoteAggregate = jest.fn();
const qualityVotesToGuidance = jest.fn();
const loadRejectionDigest = jest.fn();
const isFeatureEnabled = jest.fn(() => true);

jest.mock("../../../config/feature-flags", () => ({
  isFeatureEnabled: (...args: unknown[]) => isFeatureEnabled(...args),
}));
jest.mock("../../../learning/performance-monitor", () => ({
  measureWindowPerformance: (...args: unknown[]) => measureWindowPerformance(...args),
}));
jest.mock("../../../learning/puzzle-quality-vote", () => ({
  loadQualityVoteAggregate: (...args: unknown[]) => loadQualityVoteAggregate(...args),
  qualityVotesToGuidance: (...args: unknown[]) => qualityVotesToGuidance(...args),
}));
jest.mock("../../../learning/rejection-digest", () => ({
  loadRejectionDigest: (...args: unknown[]) => loadRejectionDigest(...args),
}));

import { loadLearningDigest } from "../learning-context";

describe("learning digest ← rejection digester integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isFeatureEnabled.mockReturnValue(true);
    measureWindowPerformance.mockResolvedValue({
      lookbackDays: 7,
      finalPlays: 20,
      solves: 10,
      abandons: 2,
      solveRate: 0.5,
      abandonRate: 0.1,
      medianSolveSeconds: 90,
      avgSolveSeconds: 100,
      avgAttemptsOnSolve: 2,
      avgHintsOnFinal: 1.2,
      puzzleCount: 7,
      tooEasy: false,
      tooHard: false,
      difficultyDelta: 0,
      notes: ["window ok"],
    });
    loadQualityVoteAggregate.mockResolvedValue({ total: 0 });
    qualityVotesToGuidance.mockReturnValue({
      preferPatterns: [],
      avoidPatterns: [],
      notes: [],
    });
  });

  it("merges rejection-mode avoid/prefer guidance into the digest", async () => {
    loadRejectionDigest.mockResolvedValue({
      lookbackDays: 14,
      sampleSize: 5,
      buckets: [{ code: "missing_seed_cues", count: 5, examples: [] }],
      avoidPatterns: ["Composing boards that omit host-owned answer-seed cues"],
      preferPatterns: ["Place every mandatory catalog/text/operator cue before returning a draft"],
      notes: ["Recent reject mode missing_seed_cues ×5"],
    });

    const digest = await loadLearningDigest({ lookbackDays: 7 });

    expect(loadRejectionDigest).toHaveBeenCalled();
    expect(digest.enabled).toBe(true);
    expect(digest.avoidPatterns).toEqual(
      expect.arrayContaining(["Composing boards that omit host-owned answer-seed cues"])
    );
    expect(digest.preferPatterns).toEqual(
      expect.arrayContaining([
        "Place every mandatory catalog/text/operator cue before returning a draft",
      ])
    );
    expect(digest.difficultyDriftNotes.join(" ")).toMatch(/missing_seed_cues/);
    expect(digest.sampleSize).toBeGreaterThanOrEqual(25);
  });

  it("stays quiet when rejection digest is empty", async () => {
    loadRejectionDigest.mockResolvedValue({
      lookbackDays: 14,
      sampleSize: 0,
      buckets: [],
      avoidPatterns: [],
      preferPatterns: [],
      notes: [],
    });

    const digest = await loadLearningDigest();
    expect(digest.avoidPatterns).not.toEqual(
      expect.arrayContaining(["Composing boards that omit host-owned answer-seed cues"])
    );
  });

  it("does not load rejection modes when learning feature flag is off", async () => {
    isFeatureEnabled.mockReturnValue(false);
    const digest = await loadLearningDigest();
    expect(digest.enabled).toBe(false);
    expect(loadRejectionDigest).not.toHaveBeenCalled();
  });
});
