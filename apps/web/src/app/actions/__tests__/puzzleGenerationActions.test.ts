const mockGetCachedDailyPuzzleFromDb = jest.fn();
const mockFindByDate = jest.fn();
const mockCreateMongoDailyPuzzleCandidateRepository = jest.fn();
const mockCreateDailyPuzzleCandidateQueue = jest.fn();
const mockSendOwnerAlert = jest.fn();
const mockTrySelectUgcLotteryFiller = jest.fn();

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
jest.mock("@/lib/notifications/owner-alerts", () => ({
  sendOwnerAlert: (...args: unknown[]) => mockSendOwnerAlert(...args),
}));
jest.mock("@/lib/ugc/lottery", () => ({
  trySelectUgcLotteryFiller: (...args: unknown[]) => mockTrySelectUgcLotteryFiller(...args),
}));
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { selectMongoReservePuzzle } from "@/ai/puzzle-agent/mongo-reserve-puzzles";
import { formatPuzzleFromDb } from "@/lib/cache/daily-puzzle";
import { publishReviewedDailyPuzzle } from "@/lib/game/publish-reviewed-daily-puzzle";
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

  it("publishes a reviewed candidate for a caller whose local date is ahead of UTC", async () => {
    jest.useFakeTimers({ now: new Date("2026-10-28T12:00:00.000Z") });
    try {
      mockGetCachedDailyPuzzleFromDb.mockResolvedValue(null);
      mockFindByDate.mockResolvedValue(null);
      jest.mocked(publishReviewedDailyPuzzle).mockResolvedValue({
        id: "reviewed-puzzle",
        date: "2026-10-29",
        aiGenerated: true,
        fromDatabase: true,
      } as unknown as Awaited<ReturnType<typeof publishReviewedDailyPuzzle>>);

      // Auckland: already Oct 29 locally while UTC is still Oct 28.
      const result = await getTodaysPuzzle(undefined, "2026-10-29", { allowAiGenerate: false });

      expect(publishReviewedDailyPuzzle).toHaveBeenCalledWith(
        expect.objectContaining({ dateString: "2026-10-29" })
      );
      expect(result.puzzle).toMatchObject({ id: "reviewed-puzzle" });
    } finally {
      jest.useRealTimers();
    }
  });
});

type Published = Awaited<ReturnType<typeof publishReviewedDailyPuzzle>>;
type Formatted = ReturnType<typeof formatPuzzleFromDb>;

describe("getTodaysPuzzle with owner approval required", () => {
  const original = process.env.OWNER_APPROVAL_REQUIRED_FROM;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OWNER_APPROVAL_REQUIRED_FROM = "2026-11-01";
    // 2026-11-20 is the live date for these tests.
    jest.useFakeTimers({ now: new Date("2026-11-20T12:00:00.000Z") });
    mockSendOwnerAlert.mockResolvedValue("sent");
    mockFindByDate.mockResolvedValue(null);
    mockTrySelectUgcLotteryFiller.mockResolvedValue(null);
    jest.mocked(publishReviewedDailyPuzzle).mockResolvedValue(null);
    jest.mocked(selectMongoReservePuzzle).mockRejectedValue(new Error("reserve not expected"));
  });
  afterEach(() => {
    jest.useRealTimers();
    if (original === undefined) Reflect.deleteProperty(process.env, "OWNER_APPROVAL_REQUIRED_FROM");
    else process.env.OWNER_APPROVAL_REQUIRED_FROM = original;
  });

  it("returns unavailable and alerts instead of using the reserve", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce(null);

    const result = await getTodaysPuzzle(undefined, "2026-11-20", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: false, unavailable: true });
    expect(selectMongoReservePuzzle).not.toHaveBeenCalled();
    expect(mockTrySelectUgcLotteryFiller).not.toHaveBeenCalled();
    expect(mockSendOwnerAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "daily_puzzle_unavailable", dateKey: "2026-11-20" })
    );
  });

  it("refuses a date that is not live anywhere without touching candidates", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce(null);

    const result = await getTodaysPuzzle(undefined, "2026-12-25", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: false, unavailable: true });
    // Publishing would claim (and burn) an approved backup for a future date.
    expect(publishReviewedDailyPuzzle).not.toHaveBeenCalled();
    expect(mockCreateMongoDailyPuzzleCandidateRepository).not.toHaveBeenCalled();
    expect(selectMongoReservePuzzle).not.toHaveBeenCalled();
    expect(mockTrySelectUgcLotteryFiller).not.toHaveBeenCalled();
  });

  it("never falls back to the UGC lottery or reserve when queued generation fails", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce(null);
    mockCreateMongoDailyPuzzleCandidateRepository.mockReturnValue({
      findByGenerationKey: jest.fn().mockResolvedValue(null),
    });
    mockCreateDailyPuzzleCandidateQueue.mockReturnValue({
      retryPending: jest.fn().mockResolvedValue(undefined),
    });
    // The generation mock returns nothing, so generation throws.

    const result = await getTodaysPuzzle("rebus", "2026-11-21", {
      allowAiGenerate: true,
      queueForPlaytest: true,
    });

    expect(result).toMatchObject({ success: false, unavailable: true });
    expect(mockTrySelectUgcLotteryFiller).not.toHaveBeenCalled();
    expect(selectMongoReservePuzzle).not.toHaveBeenCalled();
  });

  it("alerts when a backup was served", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce(null);
    jest
      .mocked(publishReviewedDailyPuzzle)
      .mockResolvedValueOnce({ id: "p1", servedFromBackup: true } as unknown as Published);

    const result = await getTodaysPuzzle(undefined, "2026-11-20", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: true, puzzle: { id: "p1" } });
    expect(mockSendOwnerAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "backup_used", level: "urgent", dateKey: "2026-11-20" })
    );
  });

  it("serves a scheduled approved puzzle without alerting", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce(null);
    jest
      .mocked(publishReviewedDailyPuzzle)
      .mockResolvedValueOnce({ id: "p2", servedFromBackup: false } as unknown as Published);

    const result = await getTodaysPuzzle(undefined, "2026-11-20", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: true, puzzle: { id: "p2" } });
    expect(mockSendOwnerAlert).not.toHaveBeenCalled();
  });

  it("refuses to serve a cached row that is not owner-approved", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce({ id: "p0", ownerApproved: false });

    const result = await getTodaysPuzzle(undefined, "2026-11-20", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: false, unavailable: true });
    expect(publishReviewedDailyPuzzle).not.toHaveBeenCalled();
    expect(mockSendOwnerAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "unapproved_live_row", dateKey: "2026-11-20" })
    );
  });

  it("serves a cached row that is owner-approved", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce({ id: "ok", ownerApproved: true });

    const result = await getTodaysPuzzle(undefined, "2026-11-20", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: true, puzzle: { id: "ok" } });
    expect(mockSendOwnerAlert).not.toHaveBeenCalled();
  });

  it("refuses an unapproved row found by the race check without publishing", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce(null);
    mockFindByDate.mockResolvedValueOnce({ id: "raced" });
    jest
      .mocked(formatPuzzleFromDb)
      .mockReturnValueOnce({ id: "raced", ownerApproved: false } as unknown as Formatted);

    const result = await getTodaysPuzzle(undefined, "2026-11-20", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: false, unavailable: true });
    expect(publishReviewedDailyPuzzle).not.toHaveBeenCalled();
    expect(mockSendOwnerAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "unapproved_live_row", dateKey: "2026-11-20" })
    );
  });

  it("serves an approved row another request persisted while the publisher ran", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce(null);
    mockFindByDate.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "winner" });
    jest
      .mocked(formatPuzzleFromDb)
      .mockReturnValueOnce({ id: "winner", ownerApproved: true } as unknown as Formatted);

    const result = await getTodaysPuzzle(undefined, "2026-11-20", { allowAiGenerate: false });

    expect(publishReviewedDailyPuzzle).toHaveBeenCalled();
    expect(mockFindByDate).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ success: true, puzzle: { id: "winner" } });
    expect(mockSendOwnerAlert).not.toHaveBeenCalled();
  });

  it("refuses an unapproved row another request persisted while the publisher ran", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce(null);
    mockFindByDate.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "loser" });
    jest
      .mocked(formatPuzzleFromDb)
      .mockReturnValueOnce({ id: "loser", ownerApproved: false } as unknown as Formatted);

    const result = await getTodaysPuzzle(undefined, "2026-11-20", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: false, unavailable: true });
    expect(mockSendOwnerAlert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "unapproved_live_row", dateKey: "2026-11-20" })
    );
  });

  it("keeps legacy behaviour for date keys before the switch", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce({ id: "old", ownerApproved: false });

    const result = await getTodaysPuzzle(undefined, "2026-10-31", { allowAiGenerate: false });

    expect(result).toMatchObject({ success: true, puzzle: { id: "old" } });
    expect(mockSendOwnerAlert).not.toHaveBeenCalled();
  });

  it("keeps the legacy reserve fallback on a miss before the switch", async () => {
    mockGetCachedDailyPuzzleFromDb.mockResolvedValueOnce(null);

    const result = await getTodaysPuzzle(undefined, "2026-10-31", { allowAiGenerate: false });

    expect(result).not.toHaveProperty("unavailable");
    expect(mockTrySelectUgcLotteryFiller).toHaveBeenCalled();
    expect(selectMongoReservePuzzle).toHaveBeenCalled();
    expect(mockSendOwnerAlert).not.toHaveBeenCalled();
  });
});
