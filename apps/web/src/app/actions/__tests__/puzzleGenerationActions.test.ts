const mockGetCachedDailyPuzzleFromDb = jest.fn();
const mockFindByDate = jest.fn();
const mockCreateMongoDailyPuzzleCandidateRepository = jest.fn();
const mockCreateDailyPuzzleCandidateQueue = jest.fn();

jest.mock("server-only", () => ({}));
jest.mock("@/ai/advanced", () => ({ generateMasterPuzzle: jest.fn() }));
jest.mock("@/ai/learning", () => ({
  baselineDifficultyForDate: jest.fn(),
  loadQualityDriftReport: jest.fn(),
  normalizeAnswerKey: jest.fn(),
  recordGenerationAudit: jest.fn(),
  resolveAdaptiveDifficultyForDate: jest.fn(),
}));
jest.mock("@/ai/learning/human-calibration-gate", () => ({
  loadHumanCalibrationGate: jest.fn(),
}));
jest.mock("@/ai/puzzle-agent/daily-challenge", () => ({
  assertDailyChallenge: jest.fn(),
}));
jest.mock("@/ai/puzzle-agent/mongo-reserve-puzzles", () => ({
  selectMongoReservePuzzle: jest.fn(),
}));
jest.mock("@/db", () => ({ db: { puzzleOps: { findByDate: mockFindByDate } } }));
jest.mock("@/lib/game/daily-puzzle-candidate-repository", () => ({
  createMongoDailyPuzzleCandidateRepository: mockCreateMongoDailyPuzzleCandidateRepository,
}));
jest.mock("@/ai/puzzle-agent/review/puzzle-playtest-server", () => ({
  puzzlePlaytestService: { submitCandidate: jest.fn() },
}));
jest.mock("@/lib/cache/daily-puzzle", () => ({
  formatPuzzleFromDb: jest.fn(),
  getCachedDailyPuzzleFromDb: mockGetCachedDailyPuzzleFromDb,
}));
jest.mock("@/lib/cache/revalidate-daily-puzzle", () => ({
  revalidateDailyPuzzle: jest.fn(),
}));
jest.mock("@/lib/game/persist-daily-puzzle", () => ({
  persistDailyPuzzle: jest.fn(),
}));
jest.mock("@/lib/game/publish-reviewed-daily-puzzle", () => ({
  publishReviewedDailyPuzzle: jest.fn(),
}));
jest.mock("@/lib/game/queue-daily-puzzle-candidate", () => ({
  createDailyPuzzleCandidateQueue: mockCreateDailyPuzzleCandidateQueue,
}));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { getTodaysPuzzle } from "../puzzleGenerationActions";

describe("daily puzzle candidate pre-generation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports an existing public row as a queue skip instead of a reviewed candidate", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValue({
      id: "legacy-public-puzzle",
      puzzle: "A sunflower picture",
      answer: "sunflower",
      puzzleType: "rebus",
      aiGenerated: true,
      fromDatabase: true,
    });

    const result = await getTodaysPuzzle("rebus", "2026-08-03", {
      allowAiGenerate: true,
      queueForPlaytest: true,
      failOnAiError: true,
    });

    expect(result.success).toBe(true);
    expect(result.candidateQueueSkipped).toBe("puzzle_already_published");
    expect(result.queuedForHumanReview).toBe(false);
    expect(result.candidateId).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("sunflower");
    expect(mockCreateDailyPuzzleCandidateQueue).not.toHaveBeenCalled();
  });

  it("does not queue a candidate if a public row appears after the cached miss", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValue(null);
    mockFindByDate.mockResolvedValue({ id: "concurrent-public-puzzle" });

    const result = await getTodaysPuzzle("rebus", "2026-08-03", {
      allowAiGenerate: true,
      queueForPlaytest: true,
      failOnAiError: true,
    });

    expect(result.candidateQueueSkipped).toBe("puzzle_already_published");
    expect(result.candidateId).toBeUndefined();
    expect(mockCreateDailyPuzzleCandidateQueue).not.toHaveBeenCalled();
  });
});
