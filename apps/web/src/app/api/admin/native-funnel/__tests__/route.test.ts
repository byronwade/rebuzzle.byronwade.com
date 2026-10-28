const verifyAdminAccess = jest.fn();
const getSummary = jest.fn();
const getDailyPuzzleQuality = jest.fn();

jest.mock("@/lib/admin-auth", () => ({ verifyAdminAccess }));
jest.mock("@/db/analytics-ops", () => ({
  nativeGrowthEventOps: { getSummary, getDailyPuzzleQuality },
}));

import { GET } from "../route";

function request(): Request {
  return new Request("https://rebuzzle.test/api/admin/native-funnel");
}

describe("GET /api/admin/native-funnel", () => {
  const now = new Date("2026-10-27T12:00:00.000Z");
  const summary = {
    openedAccountDays: 24,
    finishedAccountDays: 15,
    shareStartedAccountDays: 8,
    shareCompletedAccountDays: 5,
    shareOpenWithStartDays: 3,
    shareOpenWithFinishDays: 2,
    finishOpenRatio: 0.625,
    entrySources: { app: 12, notification: 5, widget: 4, shortcut: 3, share: 2 },
    multiDayReturners: 8,
    plusOfferViewers: 6,
    plusPurchaseStarters: 4,
    plusVerifiedPurchasers: 2,
    plusPendingAccounts: 1,
    plusCancelledAccounts: 1,
    plusUnverifiedAccounts: 0,
    plusFailedAccounts: 0,
    plusRestoreCompletedAccounts: 1,
    plusRestoreEmptyAccounts: 0,
    plusRestoreFailedAccounts: 0,
    plusSameDayPurchasers: 1,
    plusSameDayConversionRate: 1 / 6,
    reminderEnabledAccounts: 4,
    qualityFeedback: { too_easy: 2, just_right: 7, tough_but_fair: 4, unclear: 1 },
  };
  const dailyPuzzleQuality = [
    {
      puzzleDate: "2026-10-27",
      players: 3,
      guessBuckets: { one: 1, two: 0, three: 1, fourPlus: 1 },
      outcomes: { solved: 1, revealed: 1, expired: 0, ranOut: 1, inProgress: 0 },
      medianWallClockHoursToSolve: null,
      nativeRatings: {
        total: 2,
        too_easy: 0,
        just_right: 1,
        tough_but_fair: 1,
        unclear: 0,
      },
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    getSummary.mockResolvedValue(summary);
    getDailyPuzzleQuality.mockResolvedValue(dailyPuzzleQuality);
  });

  afterEach(() => jest.useRealTimers());

  it("requires administrator access", async () => {
    verifyAdminAccess.mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(getSummary).not.toHaveBeenCalled();
    expect(getDailyPuzzleQuality).not.toHaveBeenCalled();
  });

  it("includes daily puzzle quality after admin verification", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(getSummary).toHaveBeenCalledWith(start, now);
    expect(getDailyPuzzleQuality).toHaveBeenCalledWith(start, now);
    expect(body.summary).toEqual({ ...summary, dailyPuzzleQuality });
    expect(body.summary.qualityFeedback).toEqual({
      too_easy: 2,
      just_right: 7,
      tough_but_fair: 4,
      unclear: 1,
    });
    expect(body.period).toEqual({
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: now.toISOString(),
    });
    expect(JSON.stringify(body)).not.toContain("userId");
    expect(JSON.stringify(body)).not.toContain("email");
    expect(JSON.stringify(body)).not.toContain("rawEvents");
    expect(JSON.stringify(body)).not.toContain("attemptedAnswer");
  });

  it("returns 503 when the daily quality aggregation fails", async () => {
    getDailyPuzzleQuality.mockRejectedValue(new Error("puzzle attempt aggregation unavailable"));

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "Native funnel analytics are temporarily unavailable." });
  });

  it("reports unavailable when aggregation fails", async () => {
    getSummary.mockRejectedValue(new Error("database unavailable"));

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "Native funnel analytics are temporarily unavailable." });
  });
});
