/**
 * Analytics Operations
 *
 * MongoDB operations for analytics and tracking
 */

import type {
  AnalyticsEvent,
  NativeGrowthEvent,
  NativeGrowthEventSource,
  NativeGrowthPlusOfferSource,
  NativeGrowthQualityRating,
  NewAnalyticsEvent,
  NewUserSession,
  PuzzleAttempt,
  UserSession,
} from "./models";
import { getCollection } from "./mongodb";

const nativeGrowthIndexPromises = new Map<string, Promise<void>>();

export interface NativeGrowthSummary {
  openedAccountDays: number;
  finishedAccountDays: number;
  shareStartedAccountDays: number;
  shareCompletedAccountDays: number;
  shareOpenWithStartDays: number;
  shareOpenWithFinishDays: number;
  finishOpenRatio: number;
  entrySources: Record<NativeGrowthEventSource, number>;
  multiDayReturners: number;
  plusOfferViewers: number;
  plusPurchaseStarters: number;
  plusVerifiedPurchasers: number;
  plusPendingAccounts: number;
  plusCancelledAccounts: number;
  plusUnverifiedAccounts: number;
  plusFailedAccounts: number;
  plusRestoreCompletedAccounts: number;
  plusRestoreEmptyAccounts: number;
  plusRestoreFailedAccounts: number;
  plusSameDayPurchasers: number;
  plusSameDayConversionRate: number;
  plusOffersBySource: Record<NativeGrowthPlusOfferSource, NativeGrowthPlusSourceSummary>;
  reminderEnabledAccounts: number;
  dailySolvePulseViewAccountDays: number;
  qualityFeedback: Record<NativeGrowthQualityRating, number>;
}

export interface NativeGrowthPlusSourceSummary {
  viewerAccounts: number | null;
  purchaseStarterAccounts: number | null;
  verifiedPurchaserAccounts: number | null;
  pendingAccounts: number | null;
  cancelledAccounts: number | null;
  unverifiedAccounts: number | null;
  failedAccounts: number | null;
  sameDayVerifiedPurchaserAccounts: number | null;
  sameDayConversionRate: number | null;
}

export interface DailyPuzzleQualitySummary {
  puzzleDate: string;
  players: number;
  medianWallClockHoursToSolve: number | null;
  guessBuckets: { one: number; two: number; three: number; fourPlus: number };
  outcomes: {
    solved: number;
    revealed: number;
    expired: number;
    ranOut: number;
    inProgress: number;
  };
  nativeRatings: {
    total: number;
    too_easy: number;
    just_right: number;
    tough_but_fair: number;
    unclear: number;
  };
}

interface DailyNativeRatingSummary {
  puzzleDate: string;
  total: number;
  too_easy: number;
  just_right: number;
  tough_but_fair: number;
  unclear: number;
}

interface DailySolveTimeSummary {
  puzzleDate: string;
  medianWallClockHoursToSolve: number;
}

type DailyPuzzleAttemptSummary = Omit<
  DailyPuzzleQualitySummary,
  "nativeRatings" | "medianWallClockHoursToSolve"
>;

const DAY_MS = 24 * 60 * 60 * 1000;
const plusOfferSources: NativeGrowthPlusOfferSource[] = [
  "archive",
  "settings",
  "journey_insights",
  "journal",
  "free_sample",
];
const plusSourceEventTypes = [
  "plus_offer_viewed",
  "plus_purchase_started",
  "plus_purchase_verified",
  "plus_purchase_pending",
  "plus_purchase_cancelled",
  "plus_purchase_unverified",
  "plus_purchase_failed",
] as const;
type PlusSourceCountKey =
  | "viewerAccounts"
  | "purchaseStarterAccounts"
  | "verifiedPurchaserAccounts"
  | "pendingAccounts"
  | "cancelledAccounts"
  | "unverifiedAccounts"
  | "failedAccounts";
const plusSourceCountKeyByEvent: Record<(typeof plusSourceEventTypes)[number], PlusSourceCountKey> = {
  plus_offer_viewed: "viewerAccounts",
  plus_purchase_started: "purchaseStarterAccounts",
  plus_purchase_verified: "verifiedPurchaserAccounts",
  plus_purchase_pending: "pendingAccounts",
  plus_purchase_cancelled: "cancelledAccounts",
  plus_purchase_unverified: "unverifiedAccounts",
  plus_purchase_failed: "failedAccounts",
};
const emptyPlusSourceCounts = (): Record<PlusSourceCountKey, number> => ({
  viewerAccounts: 0,
  purchaseStarterAccounts: 0,
  verifiedPurchaserAccounts: 0,
  pendingAccounts: 0,
  cancelledAccounts: 0,
  unverifiedAccounts: 0,
  failedAccounts: 0,
});
const suppressSmallCount = (value: number) => (value > 0 && value < 5 ? null : value);

function ensureNativeGrowthIndexes(
  collection: ReturnType<typeof getCollection<NativeGrowthEvent>>
): Promise<void> {
  const key = collection.namespace;
  const existing = nativeGrowthIndexPromises.get(key);
  if (existing) return existing;

  const promise = (async () => {
    await collection.createIndex(
      { userId: 1, eventType: 1, dayKey: 1, source: 1 },
      { unique: true, name: "userId_eventType_dayKey_source_unique" }
    );
    await collection.createIndex(
      { occurredAt: 1 },
      { expireAfterSeconds: 90 * 24 * 60 * 60, name: "nativeGrowthEvents_ttl_90d" }
    );
  })();
  nativeGrowthIndexPromises.set(key, promise);
  void promise.catch(() => {
    if (nativeGrowthIndexPromises.get(key) === promise) nativeGrowthIndexPromises.delete(key);
  });
  return promise;
}

export const nativeGrowthEventOps = {
  /** Store one closed-schema event per account, type, and local puzzle day. */
  async recordOnce(event: NativeGrowthEvent): Promise<void> {
    const collection = getCollection<NativeGrowthEvent>("nativeGrowthEvents");
    await ensureNativeGrowthIndexes(collection);
    await collection.updateOne(
      {
        userId: event.userId,
        eventType: event.eventType,
        dayKey: event.dayKey,
        ...(event.eventType === "daily_opened" || ("source" in event && event.source)
          ? { source: event.source }
          : {}),
      },
      { $setOnInsert: event },
      { upsert: true }
    );
  },

  /** Keep only the latest player-selected rating for an account and local puzzle day. */
  async recordDailyQualityFeedback(
    event: Extract<NativeGrowthEvent, { eventType: "daily_quality_feedback" }>
  ): Promise<void> {
    const collection = getCollection<NativeGrowthEvent>("nativeGrowthEvents");
    await ensureNativeGrowthIndexes(collection);
    await collection.updateOne(
      { userId: event.userId, eventType: event.eventType, dayKey: event.dayKey },
      { $set: event },
      { upsert: true }
    );
  },

  /** Aggregate daily puzzle outcomes and ratings into date-only quality signals. */
  async getDailyPuzzleQuality(start: Date, end: Date): Promise<DailyPuzzleQualitySummary[]> {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const ratingCollection = getCollection<NativeGrowthEvent>("nativeGrowthEvents");
    const startPuzzleDate = new Date(start.getTime() - DAY_MS).toISOString().slice(0, 10);
    const endPuzzleDate = new Date(end.getTime() + DAY_MS).toISOString().slice(0, 10);
    // dayKey is account-local, so cover the full UTC interval for its buffered date range.
    const occurredAtStart = new Date(`${startPuzzleDate}T00:00:00.000Z`);
    occurredAtStart.setUTCDate(occurredAtStart.getUTCDate() - 1);
    const occurredAtEnd = new Date(`${endPuzzleDate}T00:00:00.000Z`);
    occurredAtEnd.setUTCDate(occurredAtEnd.getUTCDate() + 2);
    const [attemptRows, ratingRows, solveTimeRows] = await Promise.all([
      collection
        .aggregate<DailyPuzzleAttemptSummary>([
          {
            $match: {
              puzzleDate: {
                $gte: startPuzzleDate,
                $lte: endPuzzleDate,
                $regex: /^\d{4}-\d{2}-\d{2}$/,
              },
            },
          },
          {
            $group: {
              _id: { userId: "$userId", puzzleDate: "$puzzleDate" },
              guessCount: {
                $sum: { $cond: [{ $ne: ["$attemptType", "finalization"] }, 1, 0] },
              },
              solved: {
                $max: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$attemptType", "finalization"] },
                        { $eq: ["$isCorrect", true] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
              revealed: {
                $max: { $cond: [{ $eq: ["$finalizationReason", "revealed"] }, 1, 0] },
              },
              expired: {
                $max: { $cond: [{ $eq: ["$finalizationReason", "expired"] }, 1, 0] },
              },
              ranOut: {
                $max: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$attemptType", "finalization"] },
                        { $eq: ["$isFinal", true] },
                        { $ne: ["$isCorrect", true] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          { $match: { guessCount: { $gt: 0 } } },
          {
            $group: {
              _id: "$_id.puzzleDate",
              players: { $sum: 1 },
              oneGuess: { $sum: { $cond: [{ $eq: ["$guessCount", 1] }, 1, 0] } },
              twoGuesses: { $sum: { $cond: [{ $eq: ["$guessCount", 2] }, 1, 0] } },
              threeGuesses: { $sum: { $cond: [{ $eq: ["$guessCount", 3] }, 1, 0] } },
              fourPlusGuesses: { $sum: { $cond: [{ $gte: ["$guessCount", 4] }, 1, 0] } },
              solved: { $sum: "$solved" },
              revealed: { $sum: "$revealed" },
              expired: { $sum: "$expired" },
              ranOut: { $sum: "$ranOut" },
              inProgress: {
                $sum: {
                  $cond: [
                    { $eq: [{ $add: ["$solved", "$revealed", "$expired", "$ranOut"] }, 0] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
          { $sort: { _id: -1 } },
          { $limit: 30 },
          {
            $project: {
              _id: 0,
              puzzleDate: "$_id",
              players: 1,
              guessBuckets: {
                one: "$oneGuess",
                two: "$twoGuesses",
                three: "$threeGuesses",
                fourPlus: "$fourPlusGuesses",
              },
              outcomes: {
                solved: "$solved",
                revealed: "$revealed",
                expired: "$expired",
                ranOut: "$ranOut",
                inProgress: "$inProgress",
              },
            },
          },
        ])
        .toArray(),
      ratingCollection
        .aggregate<DailyNativeRatingSummary>([
          {
            $match: {
              eventType: "daily_quality_feedback",
              dayKey: { $gte: startPuzzleDate, $lte: endPuzzleDate },
              occurredAt: {
                $gte: occurredAtStart,
                $lt: occurredAtEnd,
              },
            },
          },
          {
            $group: {
              _id: "$dayKey",
              total: { $sum: 1 },
              too_easy: { $sum: { $cond: [{ $eq: ["$rating", "too_easy"] }, 1, 0] } },
              just_right: { $sum: { $cond: [{ $eq: ["$rating", "just_right"] }, 1, 0] } },
              tough_but_fair: {
                $sum: { $cond: [{ $eq: ["$rating", "tough_but_fair"] }, 1, 0] },
              },
              unclear: { $sum: { $cond: [{ $eq: ["$rating", "unclear"] }, 1, 0] } },
            },
          },
          {
            $project: {
              _id: 0,
              puzzleDate: "$_id",
              total: 1,
              too_easy: 1,
              just_right: 1,
              tough_but_fair: 1,
              unclear: 1,
            },
          },
        ])
        .toArray(),
      ratingCollection
        .aggregate<DailySolveTimeSummary>([
          {
            $match: {
              eventType: "daily_session_restored",
              dayKey: { $gte: startPuzzleDate, $lte: endPuzzleDate },
              occurredAt: {
                $gte: occurredAtStart,
                $lt: occurredAtEnd,
              },
            },
          },
          {
            $lookup: {
              from: "nativeGrowthEvents",
              let: {
                userId: "$userId",
                dayKey: "$dayKey",
                restoredAt: "$occurredAt",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$eventType", "daily_finished"] },
                        { $eq: ["$outcome", "solved"] },
                        { $eq: ["$userId", "$$userId"] },
                        { $eq: ["$dayKey", "$$dayKey"] },
                        { $gte: ["$occurredAt", "$$restoredAt"] },
                      ],
                    },
                  },
                },
                { $sort: { occurredAt: 1 } },
                { $limit: 1 },
                { $project: { _id: 0, occurredAt: 1 } },
              ],
              as: "solvedFinish",
            },
          },
          { $unwind: "$solvedFinish" },
          {
            $addFields: {
              elapsedHours: {
                $divide: [
                  { $subtract: ["$solvedFinish.occurredAt", "$occurredAt"] },
                  60 * 60 * 1000,
                ],
              },
            },
          },
          { $sort: { dayKey: 1, elapsedHours: 1 } },
          {
            $group: {
              _id: "$dayKey",
              elapsedHours: { $push: "$elapsedHours" },
            },
          },
          {
            $addFields: {
              sampleCount: { $size: "$elapsedHours" },
            },
          },
          { $match: { sampleCount: { $gte: 5 } } },
          {
            $project: {
              _id: 0,
              puzzleDate: "$_id",
              medianWallClockHoursToSolve: {
                $let: {
                  vars: {
                    length: { $size: "$elapsedHours" },
                    midpoint: { $floor: { $divide: [{ $size: "$elapsedHours" }, 2] } },
                  },
                  in: {
                    $cond: [
                      { $eq: [{ $mod: ["$$length", 2] }, 1] },
                      { $arrayElemAt: ["$elapsedHours", "$$midpoint"] },
                      {
                        $avg: [
                          {
                            $arrayElemAt: ["$elapsedHours", { $subtract: ["$$midpoint", 1] }],
                          },
                          { $arrayElemAt: ["$elapsedHours", "$$midpoint"] },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        ])
        .toArray(),
    ]);

    const ratingsByDate = new Map(
      ratingRows.map(({ puzzleDate, ...ratings }) => [puzzleDate, ratings])
    );
    const solveTimesByDate = new Map(
      solveTimeRows.map(({ puzzleDate, medianWallClockHoursToSolve }) => [
        puzzleDate,
        medianWallClockHoursToSolve,
      ])
    );
    return attemptRows.map((row) => ({
      ...row,
      medianWallClockHoursToSolve: solveTimesByDate.get(row.puzzleDate) ?? null,
      nativeRatings: ratingsByDate.get(row.puzzleDate) ?? {
        total: 0,
        too_easy: 0,
        just_right: 0,
        tough_but_fair: 0,
        unclear: 0,
      },
    }));
  },

  /** Aggregate funnel counts only; account identifiers never leave MongoDB. */
  async getSummary(start: Date, end: Date): Promise<NativeGrowthSummary> {
    const collection = getCollection<NativeGrowthEvent>("nativeGrowthEvents");
    const [facets] = await collection
      .aggregate<
        Record<
          string,
          Array<{
            _id?: string | { source?: string; eventType?: string };
            count?: number;
            openWithStartDays?: number;
            openWithFinishDays?: number;
          }>
        >
      >([
        { $match: { occurredAt: { $gte: start, $lt: end } } },
        {
          $facet: {
            openDays: [
              { $match: { eventType: "daily_opened" } },
              { $group: { _id: { userId: "$userId", dayKey: "$dayKey" } } },
              { $count: "count" },
            ],
            finishDays: [
              { $match: { eventType: "daily_finished" } },
              { $group: { _id: { userId: "$userId", dayKey: "$dayKey" } } },
              { $count: "count" },
            ],
            shareStartedDays: [
              { $match: { eventType: "daily_share_started" } },
              { $group: { _id: { userId: "$userId", dayKey: "$dayKey" } } },
              { $count: "count" },
            ],
            shareCompletedDays: [
              { $match: { eventType: "daily_share_completed" } },
              { $group: { _id: { userId: "$userId", dayKey: "$dayKey" } } },
              { $count: "count" },
            ],
            shareJourney: [
              {
                $group: {
                  _id: { userId: "$userId", dayKey: "$dayKey" },
                  openedViaShare: {
                    $max: {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$eventType", "daily_opened"] },
                            { $eq: ["$source", "share"] },
                          ],
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
            ],
            sourceDays: [
              { $match: { eventType: "daily_opened" } },
              {
                $group: {
                  _id: { userId: "$userId", dayKey: "$dayKey", source: "$source" },
                },
              },
              { $group: { _id: "$_id.source", count: { $sum: 1 } } },
            ],
            returners: [
              { $match: { eventType: "daily_opened" } },
              { $group: { _id: { userId: "$userId", dayKey: "$dayKey" } } },
              { $group: { _id: "$_id.userId", days: { $sum: 1 } } },
              { $match: { days: { $gte: 2 } } },
              { $count: "count" },
            ],
            plusViewers: [
              { $match: { eventType: "plus_offer_viewed" } },
              { $group: { _id: "$userId" } },
              { $count: "count" },
            ],
            plusPurchaseStarters: [
              { $match: { eventType: "plus_purchase_started" } },
              { $group: { _id: "$userId" } },
              { $count: "count" },
            ],
            plusVerifiedPurchasers: [
              { $match: { eventType: "plus_purchase_verified" } },
              { $group: { _id: "$userId" } },
              { $count: "count" },
            ],
            plusPendingAccounts: [
              { $match: { eventType: "plus_purchase_pending" } },
              { $group: { _id: "$userId" } },
              { $count: "count" },
            ],
            plusCancelledAccounts: [
              { $match: { eventType: "plus_purchase_cancelled" } },
              { $group: { _id: "$userId" } },
              { $count: "count" },
            ],
            plusUnverifiedAccounts: [
              { $match: { eventType: "plus_purchase_unverified" } },
              { $group: { _id: "$userId" } },
              { $count: "count" },
            ],
            plusFailedAccounts: [
              { $match: { eventType: "plus_purchase_failed" } },
              { $group: { _id: "$userId" } },
              { $count: "count" },
            ],
            plusRestoreCompletedAccounts: [
              { $match: { eventType: "plus_restore_completed" } },
              { $group: { _id: "$userId" } },
              { $count: "count" },
            ],
            plusRestoreEmptyAccounts: [
              { $match: { eventType: "plus_restore_empty" } },
              { $group: { _id: "$userId" } },
              { $count: "count" },
            ],
            plusRestoreFailedAccounts: [
              { $match: { eventType: "plus_restore_failed" } },
              { $group: { _id: "$userId" } },
              { $count: "count" },
            ],
            plusSameDayPurchasers: [
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
            ],
            plusSourceEventCounts: [
              {
                $match: {
                  eventType: { $in: plusSourceEventTypes },
                  source: { $in: plusOfferSources },
                },
              },
              {
                $group: {
                  _id: { userId: "$userId", source: "$source", eventType: "$eventType" },
                },
              },
              {
                $group: {
                  _id: { source: "$_id.source", eventType: "$_id.eventType" },
                  count: { $sum: 1 },
                },
              },
            ],
            plusSourceSameDayPurchasers: [
              {
                $match: {
                  eventType: { $in: ["plus_offer_viewed", "plus_purchase_verified"] },
                  source: { $in: plusOfferSources },
                },
              },
              {
                $group: {
                  _id: { userId: "$userId", source: "$source", dayKey: "$dayKey" },
                  eventTypes: { $addToSet: "$eventType" },
                },
              },
              {
                $match: {
                  eventTypes: { $all: ["plus_offer_viewed", "plus_purchase_verified"] },
                },
              },
              { $group: { _id: { userId: "$_id.userId", source: "$_id.source" } } },
              { $group: { _id: "$_id.source", count: { $sum: 1 } } },
            ],
            reminderAccounts: [
              { $match: { eventType: "reminder_enabled" } },
              { $group: { _id: "$userId" } },
              { $count: "count" },
            ],
            solvePulseViewDays: [
              { $match: { eventType: "daily_solve_pulse_viewed" } },
              { $group: { _id: { userId: "$userId", dayKey: "$dayKey" } } },
              { $count: "count" },
            ],
            qualityFeedback: [
              { $match: { eventType: "daily_quality_feedback" } },
              { $group: { _id: "$rating", count: { $sum: 1 } } },
            ],
          },
        },
      ])
      .toArray();

    const count = (name: string) => facets?.[name]?.[0]?.count ?? 0;
    const entrySources: Record<NativeGrowthEventSource, number> = {
      app: 0,
      notification: 0,
      widget: 0,
      shortcut: 0,
      share: 0,
    };
    const qualityFeedback: Record<NativeGrowthQualityRating, number> = {
      too_easy: 0,
      just_right: 0,
      tough_but_fair: 0,
      unclear: 0,
    };
    const plusSourceCounts = Object.fromEntries(
      plusOfferSources.map((source) => [source, emptyPlusSourceCounts()])
    ) as Record<NativeGrowthPlusOfferSource, Record<PlusSourceCountKey, number>>;
    const sameDayPurchasersBySource = Object.fromEntries(
      plusOfferSources.map((source) => [source, 0])
    ) as Record<NativeGrowthPlusOfferSource, number>;
    for (const source of facets?.sourceDays ?? []) {
      if (
        source._id === "app" ||
        source._id === "notification" ||
        source._id === "widget" ||
        source._id === "shortcut" ||
        source._id === "share"
      ) {
        entrySources[source._id] = source.count ?? 0;
      }
    }
    for (const rating of facets?.qualityFeedback ?? []) {
      if (
        rating._id === "too_easy" ||
        rating._id === "just_right" ||
        rating._id === "tough_but_fair" ||
        rating._id === "unclear"
      ) {
        qualityFeedback[rating._id] = rating.count ?? 0;
      }
    }
    for (const row of facets?.plusSourceEventCounts ?? []) {
      if (!row._id || typeof row._id === "string") continue;
      const source = row._id.source as NativeGrowthPlusOfferSource | undefined;
      const eventType = row._id.eventType as (typeof plusSourceEventTypes)[number] | undefined;
      if (
        !source ||
        !plusOfferSources.includes(source) ||
        !eventType ||
        !Object.hasOwn(plusSourceCountKeyByEvent, eventType)
      ) {
        continue;
      }
      plusSourceCounts[source][plusSourceCountKeyByEvent[eventType]] = row.count ?? 0;
    }
    for (const row of facets?.plusSourceSameDayPurchasers ?? []) {
      if (
        typeof row._id !== "string" ||
        !plusOfferSources.includes(row._id as NativeGrowthPlusOfferSource)
      ) {
        continue;
      }
      sameDayPurchasersBySource[row._id as NativeGrowthPlusOfferSource] = row.count ?? 0;
    }
    const plusOffersBySource = Object.fromEntries(
      plusOfferSources.map((source) => {
        const counts = plusSourceCounts[source];
        const sameDayVerifiedPurchaserAccounts = sameDayPurchasersBySource[source];
        const viewerAccounts = counts.viewerAccounts;
        return [
          source,
          {
            ...Object.fromEntries(
              Object.entries(counts).map(([key, value]) => [key, suppressSmallCount(value)])
            ),
            sameDayVerifiedPurchaserAccounts: suppressSmallCount(sameDayVerifiedPurchaserAccounts),
            sameDayConversionRate:
              viewerAccounts >= 5 && sameDayVerifiedPurchaserAccounts >= 5
                ? sameDayVerifiedPurchaserAccounts / viewerAccounts
                : null,
          },
        ];
      })
    ) as Record<NativeGrowthPlusOfferSource, NativeGrowthPlusSourceSummary>;

    const openedAccountDays = count("openDays");
    const finishedAccountDays = count("finishDays");
    const shareJourney = facets?.shareJourney?.[0];
    return {
      openedAccountDays,
      finishedAccountDays,
      shareStartedAccountDays: count("shareStartedDays"),
      shareCompletedAccountDays: count("shareCompletedDays"),
      shareOpenWithStartDays: shareJourney?.openWithStartDays ?? 0,
      shareOpenWithFinishDays: shareJourney?.openWithFinishDays ?? 0,
      finishOpenRatio: openedAccountDays > 0 ? finishedAccountDays / openedAccountDays : 0,
      entrySources,
      multiDayReturners: count("returners"),
      plusOfferViewers: count("plusViewers"),
      plusPurchaseStarters: count("plusPurchaseStarters"),
      plusVerifiedPurchasers: count("plusVerifiedPurchasers"),
      plusPendingAccounts: count("plusPendingAccounts"),
      plusCancelledAccounts: count("plusCancelledAccounts"),
      plusUnverifiedAccounts: count("plusUnverifiedAccounts"),
      plusFailedAccounts: count("plusFailedAccounts"),
      plusRestoreCompletedAccounts: count("plusRestoreCompletedAccounts"),
      plusRestoreEmptyAccounts: count("plusRestoreEmptyAccounts"),
      plusRestoreFailedAccounts: count("plusRestoreFailedAccounts"),
      plusSameDayPurchasers: count("plusSameDayPurchasers"),
      plusSameDayConversionRate:
        count("plusViewers") > 0 ? count("plusSameDayPurchasers") / count("plusViewers") : 0,
      plusOffersBySource,
      reminderEnabledAccounts: count("reminderAccounts"),
      dailySolvePulseViewAccountDays: count("solvePulseViewDays"),
      qualityFeedback,
    };
  },
};

// ============================================================================
// ANALYTICS EVENT OPERATIONS
// ============================================================================

export const analyticsEventOps = {
  /**
   * Create a new analytics event
   */
  async create(event: NewAnalyticsEvent): Promise<AnalyticsEvent> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    await collection.insertOne(event);
    return event as AnalyticsEvent;
  },

  /**
   * Get events by user ID
   */
  async findByUserId(userId: string, limit = 100): Promise<AnalyticsEvent[]> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    return await collection.find({ userId }).sort({ timestamp: -1 }).limit(limit).toArray();
  },

  /**
   * Get events by session ID
   */
  async findBySessionId(sessionId: string): Promise<AnalyticsEvent[]> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    return await collection.find({ sessionId }).sort({ timestamp: 1 }).toArray();
  },

  /**
   * Get events by type
   */
  async findByEventType(eventType: string, limit = 100): Promise<AnalyticsEvent[]> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    return await collection.find({ eventType }).sort({ timestamp: -1 }).limit(limit).toArray();
  },

  /**
   * Get events by puzzle ID
   */
  async findByPuzzleId(puzzleId: string): Promise<AnalyticsEvent[]> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    return await collection
      .find({ "metadata.puzzleId": puzzleId })
      .sort({ timestamp: -1 })
      .toArray();
  },

  /**
   * Count events by type
   */
  async countByEventType(eventType: string): Promise<number> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    return await collection.countDocuments({ eventType });
  },
};

// ============================================================================
// USER SESSION OPERATIONS
// ============================================================================

export const userSessionOps = {
  /**
   * Create a new user session
   */
  async create(session: NewUserSession): Promise<UserSession> {
    const collection = getCollection<UserSession>("userSessions");
    await collection.insertOne(session);
    return session as UserSession;
  },

  /**
   * Find session by ID
   */
  async findById(id: string): Promise<UserSession | null> {
    const collection = getCollection<UserSession>("userSessions");
    return await collection.findOne({ id });
  },

  /**
   * Find active sessions (no endTime)
   */
  async findActiveSessions(userId?: string): Promise<UserSession[]> {
    const collection = getCollection<UserSession>("userSessions");
    const query: any = { endTime: { $exists: false } };
    if (userId) {
      query.userId = userId;
    }
    return await collection.find(query).sort({ startTime: -1 }).toArray();
  },

  /**
   * Update session end time
   */
  async endSession(id: string, endTime: Date, duration?: number): Promise<void> {
    const collection = getCollection<UserSession>("userSessions");
    const update: any = { endTime, updatedAt: new Date() };
    if (duration !== undefined) {
      update.duration = duration;
    }
    await collection.updateOne({ id }, { $set: update });
  },

  /**
   * Add event to session
   */
  async addEvent(sessionId: string, eventId: string): Promise<void> {
    const collection = getCollection<UserSession>("userSessions");
    await collection.updateOne(
      { id: sessionId },
      { $addToSet: { events: eventId }, $set: { updatedAt: new Date() } }
    );
  },

  /**
   * Add puzzle to session
   */
  async addPuzzle(sessionId: string, puzzleId: string): Promise<void> {
    const collection = getCollection<UserSession>("userSessions");
    await collection.updateOne(
      { id: sessionId },
      { $addToSet: { puzzleIds: puzzleId }, $set: { updatedAt: new Date() } }
    );
  },

  /**
   * Get sessions by user ID
   */
  async findByUserId(userId: string, limit = 50): Promise<UserSession[]> {
    const collection = getCollection<UserSession>("userSessions");
    return await collection.find({ userId }).sort({ startTime: -1 }).limit(limit).toArray();
  },
};

// ============================================================================
// ANALYTICS QUERIES
// ============================================================================

export const analyticsQueries = {
  /**
   * Get active users (DAU, WAU, MAU)
   */
  async getActiveUsers(timeframe: "day" | "week" | "month" = "day"): Promise<number> {
    const collection = getCollection<UserSession>("userSessions");
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case "day":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const uniqueUsers = await collection.distinct("userId", {
      startTime: { $gte: startDate },
      userId: { $exists: true, $ne: null },
    } as Record<string, unknown>);

    return uniqueUsers.length;
  },

  /**
   * Get user retention rates
   */
  async getUserRetention(): Promise<{
    day1: number;
    day7: number;
    day30: number;
  }> {
    const _sessionsCollection = getCollection<UserSession>("userSessions");
    const eventsCollection = getCollection<AnalyticsEvent>("analyticsEvents");

    const now = new Date();
    const day1Ago = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all users who signed up
    const signupEvents = await eventsCollection.find({ eventType: "USER_SIGNUP" }).toArray();
    const totalSignups = signupEvents.length;

    if (totalSignups === 0) {
      return { day1: 0, day7: 0, day30: 0 };
    }

    // Get returning users (users who logged in after signup)
    const returnEvents = await eventsCollection
      .find({
        eventType: "USER_RETURN",
        timestamp: { $gte: day1Ago },
      })
      .toArray();
    const day1Returns = new Set(returnEvents.map((e) => e.userId)).size;

    const returnEvents7 = await eventsCollection
      .find({
        eventType: "USER_RETURN",
        timestamp: { $gte: day7Ago },
      })
      .toArray();
    const day7Returns = new Set(returnEvents7.map((e) => e.userId)).size;

    const returnEvents30 = await eventsCollection
      .find({
        eventType: "USER_RETURN",
        timestamp: { $gte: day30Ago },
      })
      .toArray();
    const day30Returns = new Set(returnEvents30.map((e) => e.userId)).size;

    return {
      day1: totalSignups > 0 ? (day1Returns / totalSignups) * 100 : 0,
      day7: totalSignups > 0 ? (day7Returns / totalSignups) * 100 : 0,
      day30: totalSignups > 0 ? (day30Returns / totalSignups) * 100 : 0,
    };
  },

  /**
   * Get puzzle completion rates
   */
  async getCompletionRates(): Promise<{
    overall: number;
    byDifficulty: Record<string, number>;
    completed: number;
    abandoned: number;
    total: number;
  }> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");

    // Get all puzzle starts
    const starts = await collection.find({ eventType: "PUZZLE_START" }).toArray();
    const total = starts.length;

    // Get all puzzle completions
    const completions = await collection.find({ eventType: "PUZZLE_COMPLETE" }).toArray();
    const completed = completions.length;

    // Get all puzzle abandons
    const abandons = await collection.find({ eventType: "PUZZLE_ABANDON" }).toArray();
    const abandoned = abandons.length;

    // Calculate by difficulty
    const byDifficulty: Record<string, number> = {};
    const difficultyGroups: Record<string, { starts: number; completes: number }> = {};

    starts.forEach((start) => {
      const difficulty = start.metadata.difficulty || "unknown";
      if (!difficultyGroups[difficulty]) {
        difficultyGroups[difficulty] = { starts: 0, completes: 0 };
      }
      difficultyGroups[difficulty].starts++;
    });

    completions.forEach((completion) => {
      const difficulty = completion.metadata.difficulty || "unknown";
      if (!difficultyGroups[difficulty]) {
        difficultyGroups[difficulty] = { starts: 0, completes: 0 };
      }
      difficultyGroups[difficulty].completes++;
    });

    Object.keys(difficultyGroups).forEach((difficulty) => {
      const group = difficultyGroups[difficulty];
      if (group) {
        byDifficulty[difficulty] = group.starts > 0 ? (group.completes / group.starts) * 100 : 0;
      }
    });

    return {
      overall: total > 0 ? (completed / total) * 100 : 0,
      byDifficulty,
      completed,
      abandoned,
      total,
    };
  },

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(): Promise<{
    averageSessionDuration: number;
    averagePuzzlesPerSession: number;
    averageHintsPerPuzzle: number;
    averageAttemptsPerPuzzle: number;
  }> {
    const sessionsCollection = getCollection<UserSession>("userSessions");
    const eventsCollection = getCollection<AnalyticsEvent>("analyticsEvents");

    // Get all completed sessions
    const sessions = await sessionsCollection.find({ duration: { $exists: true } }).toArray();

    const totalDuration = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const averageSessionDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;

    // Average puzzles per session
    const totalPuzzles = sessions.reduce((sum, session) => sum + session.puzzleIds.length, 0);
    const averagePuzzlesPerSession = sessions.length > 0 ? totalPuzzles / sessions.length : 0;

    // Average hints per puzzle
    const [hintEvents, puzzleStarts, guessEvents] = await Promise.all([
      eventsCollection.find({ eventType: "HINT_USED" }).toArray(),
      eventsCollection.find({ eventType: "PUZZLE_START" }).toArray(),
      eventsCollection.find({ eventType: "GUESS_SUBMITTED" }).toArray(),
    ]);
    const averageHintsPerPuzzle =
      puzzleStarts.length > 0 ? hintEvents.length / puzzleStarts.length : 0;

    // Average attempts per puzzle
    const averageAttemptsPerPuzzle =
      puzzleStarts.length > 0 ? guessEvents.length / puzzleStarts.length : 0;

    return {
      averageSessionDuration,
      averagePuzzlesPerSession,
      averageHintsPerPuzzle,
      averageAttemptsPerPuzzle,
    };
  },

  /**
   * Get leaderboard by timeframe
   */
  async getLeaderboardByTimeframe(
    timeframe: "today" | "week" | "month" | "allTime" = "allTime",
    limit = 10
  ): Promise<
    Array<{
      userId: string;
      username: string;
      points: number;
      completions: number;
      completionRate: number;
    }>
  > {
    const eventsCollection = getCollection<AnalyticsEvent>("analyticsEvents");
    const usersCollection = getCollection<any>("users");

    let startDate: Date | null = null;
    if (timeframe !== "allTime") {
      const now = new Date();
      switch (timeframe) {
        case "today":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "month":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    // Get puzzle completions in timeframe
    const query: any = { eventType: "PUZZLE_COMPLETE" };
    if (startDate) {
      query.timestamp = { $gte: startDate };
    }

    const completions = await eventsCollection.find(query).toArray();

    // Aggregate by user
    const userStats: Record<string, { points: number; completions: number; starts: number }> = {};

    completions.forEach((event) => {
      if (!event.userId) return;
      if (!userStats[event.userId]) {
        userStats[event.userId] = { points: 0, completions: 0, starts: 0 };
      }
      const stats = userStats[event.userId];
      if (stats) {
        stats.completions++;
        stats.points += event.metadata.score || 0;
      }
    });

    // Get puzzle starts for completion rate
    const startQuery: any = { eventType: "PUZZLE_START" };
    if (startDate) {
      startQuery.timestamp = { $gte: startDate };
    }
    const starts = await eventsCollection.find(startQuery).toArray();

    starts.forEach((event) => {
      if (!event.userId) return;
      if (!userStats[event.userId]) {
        userStats[event.userId] = { points: 0, completions: 0, starts: 0 };
      }
      const stats = userStats[event.userId];
      if (stats) {
        stats.starts++;
      }
    });

    // Get usernames
    const userIds = Object.keys(userStats);
    const users = await usersCollection.find({ id: { $in: userIds } }).toArray();
    const userMap = new Map(users.map((u) => [u.id, u.username]));

    // Build leaderboard
    const leaderboard = Object.entries(userStats)
      .map(([userId, stats]) => ({
        userId,
        username: userMap.get(userId) || "Unknown",
        points: stats.points,
        completions: stats.completions,
        completionRate: stats.starts > 0 ? (stats.completions / stats.starts) * 100 : 0,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);

    return leaderboard;
  },

  /**
   * Get total signups
   */
  async getTotalSignups(): Promise<number> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");
    return await collection.countDocuments({ eventType: "USER_SIGNUP" });
  },

  /**
   * Get metrics summary
   */
  async getMetricsSummary(): Promise<{
    totalSignups: number;
    activeUsers: {
      day: number;
      week: number;
      month: number;
    };
    retention: {
      day1: number;
      day7: number;
      day30: number;
    };
    completion: {
      overall: number;
      completed: number;
      abandoned: number;
      total: number;
    };
    engagement: {
      averageSessionDuration: number;
      averagePuzzlesPerSession: number;
    };
  }> {
    const [totalSignups, activeUsers, retention, completion, engagement] = await Promise.all([
      this.getTotalSignups(),
      Promise.all([
        this.getActiveUsers("day"),
        this.getActiveUsers("week"),
        this.getActiveUsers("month"),
      ]).then(([day, week, month]) => ({ day, week, month })),
      this.getUserRetention(),
      this.getCompletionRates(),
      this.getEngagementMetrics(),
    ]);

    return {
      totalSignups,
      activeUsers,
      retention,
      completion: {
        overall: completion.overall,
        completed: completion.completed,
        abandoned: completion.abandoned,
        total: completion.total,
      },
      engagement: {
        averageSessionDuration: engagement.averageSessionDuration,
        averagePuzzlesPerSession: engagement.averagePuzzlesPerSession,
      },
    };
  },

  /**
   * Get puzzle-specific statistics for displaying to users
   * Returns real completion rate and average solve time for a puzzle difficulty
   */
  async getPuzzleStatistics(difficulty?: number): Promise<{
    completionRate: number;
    averageSolveTime: number;
    totalAttempts: number;
  }> {
    const collection = getCollection<AnalyticsEvent>("analyticsEvents");

    // Build query for puzzle completions
    const completionQuery: Record<string, unknown> = { eventType: "PUZZLE_COMPLETE" };
    const startQuery: Record<string, unknown> = { eventType: "PUZZLE_START" };

    if (difficulty !== undefined) {
      // Match difficulty level (could be string "5" or number 5)
      completionQuery["metadata.difficulty"] = { $in: [String(difficulty), difficulty] };
      startQuery["metadata.difficulty"] = { $in: [String(difficulty), difficulty] };
    }

    // Get completions with solve times
    const [completions, starts] = await Promise.all([
      collection.find(completionQuery).toArray(),
      collection.find(startQuery).toArray(),
    ]);

    const totalAttempts = starts.length;
    const completedCount = completions.length;

    // Calculate completion rate
    const completionRate = totalAttempts > 0 ? (completedCount / totalAttempts) * 100 : 75; // Default fallback if no data

    // Calculate average solve time from completion events
    let totalSolveTime = 0;
    let solveTimeCount = 0;

    completions.forEach((event) => {
      const time = event.metadata?.completionTime || event.metadata?.timeSpent;
      if (typeof time === "number" && time > 0) {
        // Convert from milliseconds if needed (times over 1000 are likely ms)
        const seconds = time > 1000 ? time / 1000 : time;
        if (seconds < 600) {
          // Only count reasonable times (under 10 minutes)
          totalSolveTime += seconds;
          solveTimeCount++;
        }
      }
    });

    const averageSolveTime = solveTimeCount > 0 ? totalSolveTime / solveTimeCount : 90; // Default 90 seconds if no data

    return {
      completionRate: Math.round(completionRate * 10) / 10,
      averageSolveTime: Math.round(averageSolveTime),
      totalAttempts,
    };
  },
};
