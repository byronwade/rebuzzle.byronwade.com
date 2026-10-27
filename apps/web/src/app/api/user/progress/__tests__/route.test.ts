jest.mock("@/db", () => ({
  db: {
    userOps: { findById: jest.fn() },
    dailyProgressBackfillOps: { findState: jest.fn(), requestReconciliation: jest.fn() },
    dailyProgressOps: {
      countForUser: jest.fn(),
      listForUser: jest.fn(),
      materializeFromAttempt: jest.fn(),
    },
    puzzleAttemptOps: {
      countMaterializableFinalOfficialDailyAttempts: jest.fn(),
      findRecentFinalDailyAttempts: jest.fn(),
    },
  },
}));
jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: jest.fn() }));
jest.mock("@/lib/journey-timezone", () => ({ resolveStableJourneyTimeZone: jest.fn() }));

import { db } from "@/db";
import type { DailyProgress } from "@/db/models";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { resolveRequestTimeZone } from "@/lib/timezone";
import { GET } from "../route";

const progressRow = (overrides: Partial<DailyProgress> = {}): DailyProgress => ({
  userId: "self",
  puzzleDate: "2026-10-25",
  puzzleId: "puzzle-2026-10-25",
  outcome: "solved",
  attempts: 1,
  hintCount: 0,
  completedAt: new Date("2026-10-26T03:00:00.000Z"),
  timeZone: "America/Los_Angeles",
  ...overrides,
});

const finalAttempt = (overrides: Record<string, unknown> = {}) => ({
  id: "attempt-1",
  userId: "self",
  puzzleId: "puzzle-2026-10-25",
  puzzleDate: "2026-10-25",
  isFinal: true,
  isCorrect: true,
  attemptNumber: 1,
  attemptedAt: new Date("2026-10-26T03:00:00.000Z"),
  puzzleTimeZone: "America/Los_Angeles",
  hintsUsed: 0,
  ...overrides,
});

const request = (url = "https://rebuzzle.test/api/user/progress") =>
  new Request(url, { headers: { Authorization: "Bearer test-token" } });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date("2026-10-26T03:30:00.000Z"));
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "self" } as never);
  jest.mocked(resolveRequestTimeZone).mockResolvedValue("America/Los_Angeles");
  jest.mocked(resolveStableJourneyTimeZone).mockResolvedValue("America/Los_Angeles");
  jest
    .mocked(db.userOps.findById)
    .mockResolvedValue({ id: "self", journeyTimeZone: "America/Los_Angeles" } as never);
  jest.mocked(db.dailyProgressBackfillOps.findState).mockResolvedValue({
    _id: "self",
    userId: "self",
    status: "complete",
    cutoffAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-26T03:00:00.000Z"),
    reconciliationRequestedAt: new Date("2026-10-10T00:00:00.000Z"),
    reconciliationProcessedAt: new Date("2026-10-10T00:00:00.000Z"),
  });
  jest.mocked(db.dailyProgressBackfillOps.requestReconciliation).mockResolvedValue(undefined);
  jest.mocked(db.puzzleAttemptOps.findRecentFinalDailyAttempts).mockResolvedValue([]);
  jest
    .mocked(db.puzzleAttemptOps.countMaterializableFinalOfficialDailyAttempts)
    .mockResolvedValue(1);
  jest.mocked(db.dailyProgressOps.countForUser).mockResolvedValue(1);
  jest.mocked(db.dailyProgressOps.listForUser).mockResolvedValue([progressRow()]);
  jest.mocked(db.dailyProgressOps.materializeFromAttempt).mockResolvedValue(progressRow());
});

afterEach(() => jest.useRealTimers());

it("returns server-computed account progress and ignores a supplied userId", async () => {
  jest.mocked(db.dailyProgressOps.listForUser).mockResolvedValue([
    progressRow(),
    progressRow({
      puzzleDate: "2026-10-18",
      puzzleId: "puzzle-2026-10-18",
      outcome: "failed",
      attempts: 3,
      hintCount: null,
      completedAt: new Date("2026-10-19T02:00:00.000Z"),
      timeZone: null,
    }),
  ]);

  const response = await GET(request("https://rebuzzle.test/api/user/progress?userId=victim"));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(db.dailyProgressBackfillOps.findState).toHaveBeenCalledWith("self");
  expect(db.dailyProgressOps.listForUser).toHaveBeenCalledWith("self");
  expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("self", "America/Los_Angeles");
  expect(body).toEqual({
    asOfPuzzleDate: "2026-10-25",
    currentWeekStart: "2026-10-19",
    currentWeekEnd: "2026-10-25",
    summary: {
      totalXP: 175,
      level: 1,
      xpIntoLevel: 175,
      finishes: 2,
      solves: 1,
      firstGuessSolves: 1,
      unassistedSolves: 1,
      completedThisWeek: 1,
      badges: ["first-finish", "first-guess-solve"],
    },
    recentEntries: [
      {
        puzzleDate: "2026-10-25",
        puzzleId: "puzzle-2026-10-25",
        outcome: "solved",
        attempts: 1,
        hintCount: 0,
        completedAt: "2026-10-26T03:00:00.000Z",
        timeZone: "America/Los_Angeles",
      },
      {
        puzzleDate: "2026-10-18",
        puzzleId: "puzzle-2026-10-18",
        outcome: "failed",
        attempts: 3,
        hintCount: null,
        completedAt: "2026-10-19T02:00:00.000Z",
        timeZone: null,
      },
    ],
    backfill: { status: "complete" },
  });
});

it("repairs a missed finalization from a prior daily date before returning progress", async () => {
  jest.useRealTimers();
  jest.useFakeTimers().setSystemTime(new Date("2026-10-27T03:30:00.000Z"));
  jest
    .mocked(db.puzzleAttemptOps.findRecentFinalDailyAttempts)
    .mockResolvedValue([finalAttempt() as never]);
  jest
    .mocked(db.dailyProgressOps.listForUser)
    .mockResolvedValue([progressRow({ completedAt: new Date("2026-10-26T03:00:00.000Z") })]);

  const response = await GET(request());
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(db.dailyProgressOps.materializeFromAttempt).toHaveBeenCalledWith(finalAttempt());
  expect(body.asOfPuzzleDate).toBe("2026-10-26");
  expect(body.recentEntries.map((entry: { puzzleDate: string }) => entry.puzzleDate)).toContain(
    "2026-10-25"
  );
});

it("treats a new account with no final daily attempts as complete", async () => {
  jest.mocked(db.dailyProgressBackfillOps.findState).mockResolvedValue(null);
  jest
    .mocked(db.puzzleAttemptOps.countMaterializableFinalOfficialDailyAttempts)
    .mockResolvedValue(0);
  jest.mocked(db.dailyProgressOps.countForUser).mockResolvedValue(0);
  jest.mocked(db.dailyProgressOps.listForUser).mockResolvedValue([]);

  const response = await GET(request());
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.backfill.status).toBe("complete");
  expect(body.summary).toEqual({
    totalXP: 0,
    level: 1,
    xpIntoLevel: 0,
    finishes: 0,
    solves: 0,
    firstGuessSolves: 0,
    unassistedSolves: 0,
    completedThisWeek: 0,
    badges: [],
  });
});

it("keeps the account's puzzle date when another device reports a different zone", async () => {
  jest.mocked(resolveRequestTimeZone).mockResolvedValue("Asia/Tokyo");
  jest.mocked(resolveStableJourneyTimeZone).mockResolvedValue("America/Los_Angeles");

  const response = await GET(request());
  const body = await response.json();

  expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("self", "Asia/Tokyo");
  expect(body.asOfPuzzleDate).toBe("2026-10-25");
  expect(body.currentWeekStart).toBe("2026-10-19");
  expect(body.currentWeekEnd).toBe("2026-10-25");
});

it("withholds partial totals while the user's backfill is running", async () => {
  jest.mocked(db.dailyProgressBackfillOps.findState).mockResolvedValue({
    _id: "self",
    userId: "self",
    status: "scanning",
    cutoffAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-26T03:00:00.000Z"),
  });

  const response = await GET(request());
  const body = await response.json();

  expect(body.backfill.status).toBe("in_progress");
  expect(body.summary).toBeNull();
  expect(body.recentEntries).toEqual([]);
});

it("marks legacy history as not started when final attempts are missing projections", async () => {
  jest.mocked(db.dailyProgressBackfillOps.findState).mockResolvedValue(null);
  jest
    .mocked(db.puzzleAttemptOps.countMaterializableFinalOfficialDailyAttempts)
    .mockResolvedValue(9);
  jest.mocked(db.dailyProgressOps.countForUser).mockResolvedValue(2);

  const response = await GET(request());
  const body = await response.json();

  expect(body.backfill.status).toBe("not_started");
  expect(body.summary).toBeNull();
  expect(body.recentEntries).toEqual([]);
});

it("withholds stale completed totals and requests reconciliation when old projections are missing", async () => {
  jest
    .mocked(db.puzzleAttemptOps.countMaterializableFinalOfficialDailyAttempts)
    .mockResolvedValue(43);
  jest.mocked(db.dailyProgressOps.countForUser).mockResolvedValue(42);

  const response = await GET(request());
  const body = await response.json();

  expect(body.backfill.status).toBe("in_progress");
  expect(body.summary).toBeNull();
  expect(body.recentEntries).toEqual([]);
  expect(db.dailyProgressBackfillOps.requestReconciliation).toHaveBeenCalledWith("self");
});

it("requests a new reconciliation when a previous replay was processed but counts still differ", async () => {
  jest
    .mocked(db.puzzleAttemptOps.countMaterializableFinalOfficialDailyAttempts)
    .mockResolvedValue(2);
  jest.mocked(db.dailyProgressOps.countForUser).mockResolvedValue(1);

  const response = await GET(request());
  const body = await response.json();

  expect(body.backfill.status).toBe("in_progress");
  expect(body.summary).toBeNull();
  expect(db.dailyProgressBackfillOps.requestReconciliation).toHaveBeenCalledWith("self");
});

it("does not count malformed stored rows as completed Journey projections", async () => {
  jest
    .mocked(db.puzzleAttemptOps.countMaterializableFinalOfficialDailyAttempts)
    .mockResolvedValue(1);
  jest.mocked(db.dailyProgressOps.countForUser).mockResolvedValue(1);
  jest
    .mocked(db.dailyProgressOps.listForUser)
    .mockResolvedValue([progressRow({ outcome: "unknown" as never })]);

  const response = await GET(request());
  const body = await response.json();

  expect(body.backfill.status).toBe("in_progress");
  expect(body.summary).toBeNull();
  expect(db.dailyProgressBackfillOps.requestReconciliation).toHaveBeenCalledWith("self");
});

it("marks reconciliation when a recent final attempt cannot be materialized", async () => {
  jest
    .mocked(db.puzzleAttemptOps.findRecentFinalDailyAttempts)
    .mockResolvedValue([finalAttempt() as never]);
  jest
    .mocked(db.dailyProgressOps.materializeFromAttempt)
    .mockRejectedValue(new Error("temporary database failure"));

  const response = await GET(request());
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.backfill.status).toBe("in_progress");
  expect(db.dailyProgressBackfillOps.requestReconciliation).toHaveBeenCalledWith("self");
});

it("reports a retryable failure when reconciliation cannot be durably queued", async () => {
  jest
    .mocked(db.puzzleAttemptOps.countMaterializableFinalOfficialDailyAttempts)
    .mockResolvedValue(1);
  jest.mocked(db.dailyProgressOps.listForUser).mockResolvedValue([]);
  jest
    .mocked(db.dailyProgressBackfillOps.requestReconciliation)
    .mockRejectedValue(new Error("temporary database failure"));
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  const response = await GET(request());
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.backfill.status).toBe("failed");
  expect(body.summary).toBeNull();
  expect(body.recentEntries).toEqual([]);
  expect(db.dailyProgressBackfillOps.requestReconciliation).toHaveBeenCalledWith("self");
  errorSpy.mockRestore();
});

it("keeps only valid rows and bounds history to this week plus the 35 prior completions", async () => {
  const prior = Array.from({ length: 38 }, (_, index) => {
    const day = 18 - index;
    const date = new Date(Date.UTC(2026, 9, day));
    const key = date.toISOString().slice(0, 10);
    return progressRow({
      puzzleDate: key,
      puzzleId: `puzzle-${key}`,
      outcome: "failed",
      attempts: 3,
      hintCount: null,
    });
  });
  const malformed = progressRow({ puzzleDate: "2026-02-30" });
  const currentWeek = progressRow({
    puzzleDate: "2026-10-20",
    puzzleId: "puzzle-2026-10-20",
    timeZone: "Mars/Phobos",
  });
  jest
    .mocked(db.dailyProgressOps.listForUser)
    .mockResolvedValue([...prior, currentWeek, malformed] as never);

  const response = await GET(request());
  const body = await response.json();

  expect(body.recentEntries).toHaveLength(36);
  expect(body.recentEntries[0]).toMatchObject({ puzzleDate: "2026-10-20", timeZone: null });
  expect(
    body.recentEntries.some((entry: { puzzleDate: string }) => entry.puzzleDate === "2026-02-30")
  ).toBe(false);
});

it("returns unauthorized without a bearer identity", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValue(null);

  const response = await GET(new Request("https://rebuzzle.test/api/user/progress"));

  expect(response.status).toBe(401);
  expect(db.dailyProgressOps.listForUser).not.toHaveBeenCalled();
});
