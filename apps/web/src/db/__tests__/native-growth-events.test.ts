jest.mock("@/db/mongodb", () => ({ getCollection: jest.fn() }));

import { nativeGrowthEventOps } from "../analytics-ops";
import { getCollection } from "../mongodb";

const mockGetCollection = jest.mocked(getCollection);

describe("nativeGrowthEventOps.recordOnce", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps the first daily session restore for an account and puzzle date", async () => {
    const stored = new Map<string, Record<string, unknown>>();
    const updateOne = jest.fn(
      async (
        filter: { userId: string; eventType: string; dayKey: string; source?: string },
        update: { $setOnInsert: Record<string, unknown> }
      ) => {
        const key = `${filter.userId}:${filter.eventType}:${filter.dayKey}`;
        if (!stored.has(key)) stored.set(key, update.$setOnInsert);
        return { acknowledged: true };
      }
    );
    const collection = {
      namespace: "rebuzzle.nativeGrowthEvents.sessionRestoreIdempotency",
      createIndex: jest.fn(async () => "index"),
      updateOne,
    };
    mockGetCollection.mockReturnValue(collection as never);
    const first = {
      userId: "account-1",
      eventType: "daily_session_restored" as const,
      dayKey: "2026-10-27",
      occurredAt: new Date("2026-10-27T08:00:00.000Z"),
    };

    await nativeGrowthEventOps.recordOnce(first);
    await nativeGrowthEventOps.recordOnce({
      ...first,
      occurredAt: new Date("2026-10-27T14:00:00.000Z"),
    });

    expect(updateOne.mock.calls.map(([filter]) => filter)).toEqual([
      { userId: "account-1", eventType: "daily_session_restored", dayKey: "2026-10-27" },
      { userId: "account-1", eventType: "daily_session_restored", dayKey: "2026-10-27" },
    ]);
    expect(stored.get("account-1:daily_session_restored:2026-10-27")).toEqual(first);
  });

  it("recordOnceCreatesIndexesBeforeUpsertingAndIsIdempotent", async () => {
    const calls: unknown[] = [];
    const documents = new Map<string, Record<string, unknown>>();
    const createCollection = () => ({
      namespace: "rebuzzle.nativeGrowthEvents",
      createIndex: jest.fn(async (spec: unknown, options: unknown) => {
        calls.push(["index", spec, options]);
        return "index";
      }),
      updateOne: jest.fn(
        async (
          filter: { userId: string; eventType: string; dayKey: string; source?: string },
          update: { $setOnInsert: Record<string, unknown> },
          options: { upsert: boolean }
        ) => {
          calls.push(["write", filter, update, options]);
          const key = `${filter.userId}:${filter.eventType}:${filter.dayKey}:${filter.source ?? ""}`;
          if (!documents.has(key)) documents.set(key, update.$setOnInsert);
          return { acknowledged: true, upsertedCount: 1 };
        }
      ),
    });
    const collections = [createCollection(), createCollection(), createCollection()];
    let nextCollection = 0;
    mockGetCollection.mockImplementation(() => collections[nextCollection++] as never);

    const occurredAt = new Date("2026-10-27T12:00:00.000Z");
    const event = {
      userId: "account-1",
      eventType: "daily_opened" as const,
      dayKey: "2026-10-27",
      occurredAt,
      source: "widget" as const,
    };

    await nativeGrowthEventOps.recordOnce(event);
    const retry = { ...event, occurredAt: new Date("2026-10-27T12:05:00.000Z") };
    await nativeGrowthEventOps.recordOnce(retry);
    const otherSource = { ...event, source: "app" as const };
    await nativeGrowthEventOps.recordOnce(otherSource);

    expect(calls.slice(0, 2)).toEqual([
      [
        "index",
        { userId: 1, eventType: 1, dayKey: 1, source: 1 },
        { unique: true, name: "userId_eventType_dayKey_source_unique" },
      ],
      [
        "index",
        { occurredAt: 1 },
        { expireAfterSeconds: 90 * 24 * 60 * 60, name: "nativeGrowthEvents_ttl_90d" },
      ],
    ]);
    expect(calls[2]).toEqual([
      "write",
      { userId: "account-1", eventType: "daily_opened", dayKey: "2026-10-27", source: "widget" },
      { $setOnInsert: event },
      { upsert: true },
    ]);
    expect(calls[3]).toEqual([
      "write",
      { userId: "account-1", eventType: "daily_opened", dayKey: "2026-10-27", source: "widget" },
      { $setOnInsert: retry },
      { upsert: true },
    ]);
    expect(calls[4]).toEqual([
      "write",
      { userId: "account-1", eventType: "daily_opened", dayKey: "2026-10-27", source: "app" },
      { $setOnInsert: otherSource },
      { upsert: true },
    ]);
    expect(collections.reduce((total, item) => total + item.createIndex.mock.calls.length, 0)).toBe(
      2
    );
    expect(collections.reduce((total, item) => total + item.updateOne.mock.calls.length, 0)).toBe(
      3
    );
    expect(documents.size).toBe(2);
    expect(documents.get("account-1:daily_opened:2026-10-27:widget")).toEqual(event);
    expect(JSON.stringify([...documents.values()])).not.toContain("puzzleId");
  });
});

describe("nativeGrowthEventOps.recordDailyQualityFeedback", () => {
  beforeEach(() => jest.clearAllMocks());

  it("replaces the existing account/day rating instead of creating another response", async () => {
    const calls: unknown[] = [];
    const documents = new Map<string, Record<string, unknown>>();
    const collection = {
      namespace: "rebuzzle.nativeGrowthQualityFeedbackEvents",
      createIndex: jest.fn(async () => "index"),
      updateOne: jest.fn(
        async (
          filter: { userId: string; eventType: string; dayKey: string },
          update: { $set: Record<string, unknown> },
          options: { upsert: boolean }
        ) => {
          calls.push([filter, update, options]);
          const key = `${filter.userId}:${filter.eventType}:${filter.dayKey}`;
          documents.set(key, update.$set);
          return { acknowledged: true, upsertedCount: 1 };
        }
      ),
    };
    mockGetCollection.mockReturnValue(collection as never);

    const base = {
      userId: "account-1",
      eventType: "daily_quality_feedback" as const,
      dayKey: "2026-10-27",
    };
    await nativeGrowthEventOps.recordDailyQualityFeedback({
      ...base,
      occurredAt: new Date("2026-10-27T12:00:00.000Z"),
      rating: "just_right",
    });
    await nativeGrowthEventOps.recordDailyQualityFeedback({
      ...base,
      occurredAt: new Date("2026-10-27T12:05:00.000Z"),
      rating: "tough_but_fair",
    });

    expect(calls).toEqual([
      [
        { userId: "account-1", eventType: "daily_quality_feedback", dayKey: "2026-10-27" },
        {
          $set: {
            ...base,
            occurredAt: new Date("2026-10-27T12:00:00.000Z"),
            rating: "just_right",
          },
        },
        { upsert: true },
      ],
      [
        { userId: "account-1", eventType: "daily_quality_feedback", dayKey: "2026-10-27" },
        {
          $set: {
            ...base,
            occurredAt: new Date("2026-10-27T12:05:00.000Z"),
            rating: "tough_but_fair",
          },
        },
        { upsert: true },
      ],
    ]);
    expect(documents.size).toBe(1);
    expect(documents.get("account-1:daily_quality_feedback:2026-10-27")).toEqual({
      ...base,
      occurredAt: new Date("2026-10-27T12:05:00.000Z"),
      rating: "tough_but_fair",
    });
  });
});

describe("nativeGrowthEventOps.getSummary", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns only aggregate account-day and account counts for the requested window", async () => {
    const start = new Date("2026-09-27T12:00:00.000Z");
    const end = new Date("2026-10-27T12:00:00.000Z");
    const aggregate = jest.fn().mockReturnValue({
      toArray: async () => [
        {
          openDays: [{ count: 8 }],
          finishDays: [{ count: 5 }],
          shareStartedDays: [{ count: 7 }],
          shareCompletedDays: [{ count: 3 }],
          shareJourney: [{ openWithStartDays: 1, openWithFinishDays: 2 }],
          solvePulseViewDays: [{ count: 3 }],
          sourceDays: [
            { _id: "app", count: 4 },
            { _id: "widget", count: 3 },
            { _id: "share", count: 1 },
          ],
          returners: [{ count: 2 }],
          plusViewers: [{ count: 6 }],
          plusPurchaseStarters: [{ count: 5 }],
          plusVerifiedPurchasers: [{ count: 2 }],
          plusPendingAccounts: [{ count: 1 }],
          plusCancelledAccounts: [{ count: 1 }],
          plusUnverifiedAccounts: [{ count: 1 }],
          plusFailedAccounts: [{ count: 1 }],
          plusRestoreCompletedAccounts: [{ count: 2 }],
          plusRestoreEmptyAccounts: [{ count: 1 }],
          plusRestoreFailedAccounts: [{ count: 1 }],
          plusSameDayPurchasers: [{ count: 1 }],
          reminderAccounts: [{ count: 4 }],
          qualityFeedback: [
            { _id: "too_easy", count: 2 },
            { _id: "just_right", count: 3 },
            { _id: "tough_but_fair", count: 1 },
          ],
        },
      ],
    });
    mockGetCollection.mockReturnValue({ aggregate } as never);

    const summary = await nativeGrowthEventOps.getSummary(start, end);
    const pipeline = aggregate.mock.calls[0][0] as Record<string, unknown>[];

    expect(summary).toEqual({
      openedAccountDays: 8,
      finishedAccountDays: 5,
      shareStartedAccountDays: 7,
      shareCompletedAccountDays: 3,
      shareOpenWithStartDays: 1,
      shareOpenWithFinishDays: 2,
      finishOpenRatio: 0.625,
      entrySources: { app: 4, notification: 0, widget: 3, shortcut: 0, share: 1 },
      multiDayReturners: 2,
      plusOfferViewers: 6,
      plusPurchaseStarters: 5,
      plusVerifiedPurchasers: 2,
      plusPendingAccounts: 1,
      plusCancelledAccounts: 1,
      plusUnverifiedAccounts: 1,
      plusFailedAccounts: 1,
      plusRestoreCompletedAccounts: 2,
      plusRestoreEmptyAccounts: 1,
      plusRestoreFailedAccounts: 1,
      plusSameDayPurchasers: 1,
      plusSameDayConversionRate: 1 / 6,
      reminderEnabledAccounts: 4,
      dailySolvePulseViewAccountDays: 3,
      qualityFeedback: { too_easy: 2, just_right: 3, tough_but_fair: 1, unclear: 0 },
    });
    expect(pipeline[0]).toEqual({ $match: { occurredAt: { $gte: start, $lt: end } } });
    expect(pipeline[1]).toHaveProperty("$facet.openDays");
    expect(pipeline[1]).toHaveProperty("$facet.finishDays");
    expect(pipeline[1]).toHaveProperty("$facet.shareStartedDays");
    expect(pipeline[1]).toHaveProperty("$facet.shareCompletedDays");
    expect(pipeline[1]).toHaveProperty("$facet.shareJourney");
    expect(pipeline[1]).toHaveProperty("$facet.solvePulseViewDays");
    expect(pipeline[1]).toHaveProperty("$facet.sourceDays");
    expect(pipeline[1]).toHaveProperty("$facet.returners");
    expect(pipeline[1]).toHaveProperty("$facet.plusViewers");
    expect(pipeline[1]).toHaveProperty("$facet.plusPurchaseStarters");
    expect(pipeline[1]).toHaveProperty("$facet.plusVerifiedPurchasers");
    expect(pipeline[1]).toHaveProperty("$facet.plusPendingAccounts");
    expect(pipeline[1]).toHaveProperty("$facet.plusCancelledAccounts");
    expect(pipeline[1]).toHaveProperty("$facet.plusUnverifiedAccounts");
    expect(pipeline[1]).toHaveProperty("$facet.plusFailedAccounts");
    expect(pipeline[1]).toHaveProperty("$facet.plusRestoreCompletedAccounts");
    expect(pipeline[1]).toHaveProperty("$facet.plusRestoreEmptyAccounts");
    expect(pipeline[1]).toHaveProperty("$facet.plusRestoreFailedAccounts");
    expect(pipeline[1]).toHaveProperty("$facet.plusSameDayPurchasers");
    expect(pipeline[1]).toHaveProperty("$facet.reminderAccounts");
    expect(pipeline[1]).toHaveProperty("$facet.qualityFeedback");
    const facets = (pipeline[1] as { $facet: Record<string, unknown[]> }).$facet;
    expect(facets.solvePulseViewDays).toEqual([
      { $match: { eventType: "daily_solve_pulse_viewed" } },
      { $group: { _id: { userId: "$userId", dayKey: "$dayKey" } } },
      { $count: "count" },
    ]);
    expect(facets.shareJourney).toEqual([
      {
        $group: {
          _id: { userId: "$userId", dayKey: "$dayKey" },
          openedViaShare: {
            $max: {
              $cond: [
                {
                  $and: [{ $eq: ["$eventType", "daily_opened"] }, { $eq: ["$source", "share"] }],
                },
                1,
                0,
              ],
            },
          },
          started: {
            $max: { $cond: [{ $eq: ["$eventType", "daily_started"] }, 1, 0] },
          },
          finished: {
            $max: { $cond: [{ $eq: ["$eventType", "daily_finished"] }, 1, 0] },
          },
        },
      },
      { $match: { openedViaShare: 1 } },
      {
        $group: {
          _id: null,
          openWithStartDays: { $sum: "$started" },
          openWithFinishDays: { $sum: "$finished" },
        },
      },
    ]);
    expect(facets.plusSameDayPurchasers).toEqual([
      {
        $match: {
          eventType: { $in: ["plus_offer_viewed", "plus_purchase_verified"] },
        },
      },
      {
        $group: {
          _id: { userId: "$userId", dayKey: "$dayKey" },
          eventTypes: { $addToSet: "$eventType" },
        },
      },
      {
        $match: {
          eventTypes: { $all: ["plus_offer_viewed", "plus_purchase_verified"] },
        },
      },
      { $group: { _id: "$_id.userId" } },
      { $count: "count" },
    ]);
    expect(JSON.stringify(facets.plusSameDayPurchasers)).not.toContain("plus_restore_completed");
    expect(JSON.stringify(summary)).not.toContain("userId");
  });

  it("returns a zeroed summary for an empty window", async () => {
    mockGetCollection.mockReturnValue({
      aggregate: jest.fn().mockReturnValue({ toArray: async () => [{}] }),
    } as never);

    await expect(
      nativeGrowthEventOps.getSummary(new Date("2026-09-27"), new Date("2026-10-27"))
    ).resolves.toEqual({
      openedAccountDays: 0,
      finishedAccountDays: 0,
      shareStartedAccountDays: 0,
      shareCompletedAccountDays: 0,
      shareOpenWithStartDays: 0,
      shareOpenWithFinishDays: 0,
      finishOpenRatio: 0,
      entrySources: { app: 0, notification: 0, widget: 0, shortcut: 0, share: 0 },
      multiDayReturners: 0,
      plusOfferViewers: 0,
      plusPurchaseStarters: 0,
      plusVerifiedPurchasers: 0,
      plusPendingAccounts: 0,
      plusCancelledAccounts: 0,
      plusUnverifiedAccounts: 0,
      plusFailedAccounts: 0,
      plusRestoreCompletedAccounts: 0,
      plusRestoreEmptyAccounts: 0,
      plusRestoreFailedAccounts: 0,
      plusSameDayPurchasers: 0,
      plusSameDayConversionRate: 0,
      reminderEnabledAccounts: 0,
      dailySolvePulseViewAccountDays: 0,
      qualityFeedback: { too_easy: 0, just_right: 0, tough_but_fair: 0, unclear: 0 },
    });
  });
});
