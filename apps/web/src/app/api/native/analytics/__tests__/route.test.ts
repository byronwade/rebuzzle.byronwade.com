jest.mock("@/db/analytics-ops", () => ({
  nativeGrowthEventOps: {
    recordOnce: jest.fn(),
    recordDailyQualityFeedback: jest.fn(),
  },
}));
jest.mock("@/lib/auth-middleware", () => ({ getAuthenticatedUser: jest.fn() }));
jest.mock("@/lib/timezone", () => ({ resolveRequestTimeZone: jest.fn() }));
jest.mock("@/lib/journey-timezone", () => ({ resolveStableJourneyTimeZone: jest.fn() }));
jest.mock("@/lib/middleware/rate-limit", () => ({
  rateLimiters: { api: jest.fn().mockResolvedValue(null) },
}));
jest.mock("@/lib/storekit/plus-entitlement", () => ({
  STOREKIT_TRANSACTION_HEADER: "X-Rebuzzle-StoreKit-Transaction",
  verifyPlusTransaction: jest.fn(),
}));

import { nativeGrowthEventOps } from "@/db/analytics-ops";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { verifyPlusTransaction } from "@/lib/storekit/plus-entitlement";
import { resolveRequestTimeZone } from "@/lib/timezone";

async function post(body: unknown, extraHeaders: Record<string, string> = {}) {
  const { POST } = await import("../route");
  return POST(
    new Request("https://example.com/api/native/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date("2026-10-27T06:30:00.000Z"));
  jest.mocked(getAuthenticatedUser).mockResolvedValue({ userId: "server-account" } as never);
  jest.mocked(resolveRequestTimeZone).mockResolvedValue("UTC");
  jest.mocked(resolveStableJourneyTimeZone).mockResolvedValue("America/Los_Angeles");
  jest.mocked(verifyPlusTransaction).mockResolvedValue(null);
});
afterEach(() => jest.useRealTimers());

it("requiresAuthentication", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValue(null);
  const response = await post({ eventType: "daily_opened", source: "app" });
  expect(response.status).toBe(401);
  expect(nativeGrowthEventOps.recordOnce).not.toHaveBeenCalled();
});

it("rejectsUnknownEventAndClientOwnedFinish", async () => {
  expect((await post({ eventType: "made_up_event" })).status).toBe(400);
  expect((await post({ eventType: "daily_started" })).status).toBe(400);
  expect((await post({ eventType: "daily_finished", outcome: "solved" })).status).toBe(400);
  expect((await post({ eventType: "daily_session_restored" })).status).toBe(400);
  expect(nativeGrowthEventOps.recordOnce).not.toHaveBeenCalled();
});

it("rejectsExtraFieldsAndInvalidSource", async () => {
  expect(
    (
      await post({
        eventType: "daily_opened",
        source: "app",
        userId: "victim",
      })
    ).status
  ).toBe(400);
  expect(
    (await post({ eventType: "daily_opened", source: "email", occurredAt: "2026-10-27" })).status
  ).toBe(400);
  expect((await post({ eventType: "daily_share_started", platform: "messages" })).status).toBe(400);
  expect((await post({ eventType: "daily_solve_pulse_viewed", puzzleId: "daily-1" })).status).toBe(
    400
  );
  expect((await post({ eventType: "plus_purchase_verified", userId: "victim" })).status).toBe(400);
  expect(nativeGrowthEventOps.recordOnce).not.toHaveBeenCalled();
});

it("derivesIdentityDayAndTimeFromServer", async () => {
  const response = await post({ eventType: "daily_opened", source: "widget" });

  expect(response.status).toBe(200);
  expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("server-account", "UTC");
  expect(nativeGrowthEventOps.recordOnce).toHaveBeenCalledWith({
    userId: "server-account",
    eventType: "daily_opened",
    dayKey: "2026-10-26",
    occurredAt: new Date("2026-10-27T06:30:00.000Z"),
    source: "widget",
  });
});

it("accepts a share-attributed daily open", async () => {
  const response = await post({ eventType: "daily_opened", source: "share" });

  expect(response.status).toBe(200);
  expect(nativeGrowthEventOps.recordOnce).toHaveBeenCalledWith({
    userId: "server-account",
    eventType: "daily_opened",
    dayKey: "2026-10-26",
    occurredAt: new Date("2026-10-27T06:30:00.000Z"),
    source: "share",
  });
});

it.each([
  "plus_offer_viewed",
  "plus_purchase_started",
  "plus_purchase_pending",
  "plus_purchase_cancelled",
  "plus_purchase_unverified",
  "plus_purchase_failed",
  "plus_restore_completed",
  "plus_restore_empty",
  "plus_restore_failed",
  "reminder_enabled",
  "daily_share_started",
  "daily_share_completed",
  "daily_solve_pulse_viewed",
] as const)("accepts the closed %s event without client metadata", async (eventType) => {
  expect((await post({ eventType })).status).toBe(200);
  expect(nativeGrowthEventOps.recordOnce).toHaveBeenCalledWith({
    userId: "server-account",
    eventType,
    dayKey: "2026-10-26",
    occurredAt: new Date("2026-10-27T06:30:00.000Z"),
  });
});

it("requires a server-verified Apple transaction before recording a verified purchase", async () => {
  const response = await post(
    { eventType: "plus_purchase_verified" },
    {
      "X-Rebuzzle-StoreKit-Transaction": "signed-transaction",
    }
  );

  expect(response.status).toBe(403);
  expect(verifyPlusTransaction).toHaveBeenCalledWith("signed-transaction");
  expect(nativeGrowthEventOps.recordOnce).not.toHaveBeenCalled();
});

it("records verified-purchase analytics only after StoreKit proof is accepted", async () => {
  jest.mocked(verifyPlusTransaction).mockResolvedValue({ transactionId: "verified" } as never);
  const response = await post(
    { eventType: "plus_purchase_verified" },
    {
      "X-Rebuzzle-StoreKit-Transaction": "signed-transaction",
    }
  );

  expect(response.status).toBe(200);
  expect(verifyPlusTransaction).toHaveBeenCalledWith("signed-transaction");
  expect(nativeGrowthEventOps.recordOnce).toHaveBeenCalledWith({
    userId: "server-account",
    eventType: "plus_purchase_verified",
    dayKey: "2026-10-26",
    occurredAt: new Date("2026-10-27T06:30:00.000Z"),
  });
});

it.each(["too_easy", "just_right", "tough_but_fair", "unclear"] as const)(
  "accepts the closed daily quality rating %s for the server-owned local puzzle date",
  async (rating) => {
    const response = await post({
      eventType: "daily_quality_feedback",
      rating,
      puzzleDate: "2026-10-26",
    });

    expect(response.status).toBe(200);
    expect(resolveStableJourneyTimeZone).toHaveBeenCalledWith("server-account", "UTC");
    expect(nativeGrowthEventOps.recordDailyQualityFeedback).toHaveBeenCalledWith({
      userId: "server-account",
      eventType: "daily_quality_feedback",
      dayKey: "2026-10-26",
      occurredAt: new Date("2026-10-27T06:30:00.000Z"),
      rating,
    });
  }
);

it("rejects a rating submitted for a stale puzzle date", async () => {
  const response = await post({
    eventType: "daily_quality_feedback",
    rating: "just_right",
    puzzleDate: "2026-10-25",
  });

  expect(response.status).toBe(409);
  expect(nativeGrowthEventOps.recordDailyQualityFeedback).not.toHaveBeenCalled();
});

it("rejects unknown ratings and any client-owned identity, date, answer, or extra field", async () => {
  const invalidBodies = [
    { eventType: "daily_quality_feedback", rating: "impossible" },
    { eventType: "daily_quality_feedback", rating: "just_right" },
    { eventType: "daily_quality_feedback", rating: "just_right", puzzleDate: "2026-1-1" },
    { eventType: "daily_quality_feedback", rating: "just_right", userId: "victim" },
    { eventType: "daily_quality_feedback", rating: "just_right", dayKey: "2026-10-25" },
    {
      eventType: "daily_quality_feedback",
      rating: "just_right",
      occurredAt: "2026-10-27T06:30:00.000Z",
    },
    { eventType: "daily_quality_feedback", rating: "just_right", answer: "lighthouse" },
    { eventType: "daily_quality_feedback", rating: "just_right", metadata: {} },
  ];

  for (const body of invalidBodies) expect((await post(body)).status).toBe(400);
  expect(nativeGrowthEventOps.recordDailyQualityFeedback).not.toHaveBeenCalled();
});

it("does not store quality feedback without authentication", async () => {
  jest.mocked(getAuthenticatedUser).mockResolvedValue(null);

  expect((await post({ eventType: "daily_quality_feedback", rating: "just_right" })).status).toBe(
    401
  );
  expect(nativeGrowthEventOps.recordDailyQualityFeedback).not.toHaveBeenCalled();
});
