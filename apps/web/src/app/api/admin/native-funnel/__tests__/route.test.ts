const verifyAdminAccess = jest.fn();
const getSummary = jest.fn();

jest.mock("@/lib/admin-auth", () => ({ verifyAdminAccess }));
jest.mock("@/db/analytics-ops", () => ({
  nativeGrowthEventOps: { getSummary },
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
    finishOpenRatio: 0.625,
    entrySources: { app: 12, notification: 5, widget: 4, shortcut: 3 },
    multiDayReturners: 8,
    plusOfferViewers: 6,
    reminderEnabledAccounts: 4,
    qualityFeedback: { too_easy: 2, just_right: 7, tough_but_fair: 4, unclear: 1 },
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
    verifyAdminAccess.mockResolvedValue({ id: "admin-1" });
    getSummary.mockResolvedValue(summary);
  });

  afterEach(() => jest.useRealTimers());

  it("requires administrator access", async () => {
    verifyAdminAccess.mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(getSummary).not.toHaveBeenCalled();
  });

  it("returns an aggregate-only 30-day summary", async () => {
    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(getSummary).toHaveBeenCalledWith(
      new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      now
    );
    expect(body.summary).toEqual(summary);
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
  });

  it("reports unavailable when aggregation fails", async () => {
    getSummary.mockRejectedValue(new Error("database unavailable"));

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "Native funnel analytics are temporarily unavailable." });
  });
});
