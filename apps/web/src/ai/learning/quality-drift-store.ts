import { getCollection } from "@/db/mongodb";
import {
  assessQualityDrift,
  type QualityDriftReport,
  type QualityDriftWindow,
} from "./quality-drift";

type DualCounts = {
  fastTotal?: number;
  slowTotal?: number;
  fastPrimary?: number;
  slowPrimary?: number;
  fastSecondary?: number;
  slowSecondary?: number;
  fastTertiary?: number;
  slowTertiary?: number;
};

function count(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

async function loadFeedbackCounts(slowCutoff: Date, fastCutoff: Date): Promise<DualCounts> {
  const [result] = await getCollection("aiFeedback")
    .aggregate<DualCounts>([
      {
        $match: {
          feedbackType: "puzzle_quality",
          timestamp: { $gte: slowCutoff },
        },
      },
      {
        $group: {
          _id: null,
          slowTotal: { $sum: 1 },
          fastTotal: { $sum: { $cond: [{ $gte: ["$timestamp", fastCutoff] }, 1, 0] } },
          slowPrimary: {
            $sum: { $cond: [{ $lt: [{ $ifNull: ["$rating", 0] }, 4] }, 1, 0] },
          },
          fastPrimary: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$timestamp", fastCutoff] },
                    { $lt: [{ $ifNull: ["$rating", 0] }, 4] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          slowSecondary: {
            $sum: { $cond: [{ $eq: ["$metrics.unrecognizable", true] }, 1, 0] },
          },
          fastSecondary: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$timestamp", fastCutoff] },
                    { $eq: ["$metrics.unrecognizable", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          slowTertiary: {
            $sum: {
              $cond: [
                {
                  $or: [{ $eq: ["$metrics.ambiguous", true] }, { $eq: ["$metrics.unfair", true] }],
                },
                1,
                0,
              ],
            },
          },
          fastTertiary: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$timestamp", fastCutoff] },
                    {
                      $or: [
                        { $eq: ["$metrics.ambiguous", true] },
                        { $eq: ["$metrics.unfair", true] },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ])
    .toArray();
  return result ?? {};
}

async function loadPlayCounts(slowCutoff: Date, fastCutoff: Date): Promise<DualCounts> {
  const [result] = await getCollection("puzzleAttempts")
    .aggregate<DualCounts>([
      {
        $match: {
          isFinal: true,
          attemptedAt: { $gte: slowCutoff },
          puzzleDate: { $not: { $regex: /^archive:/ } },
        },
      },
      {
        $group: {
          _id: null,
          slowTotal: { $sum: 1 },
          fastTotal: { $sum: { $cond: [{ $gte: ["$attemptedAt", fastCutoff] }, 1, 0] } },
          slowPrimary: { $sum: { $cond: [{ $eq: ["$isCorrect", true] }, 1, 0] } },
          fastPrimary: {
            $sum: {
              $cond: [
                {
                  $and: [{ $gte: ["$attemptedAt", fastCutoff] }, { $eq: ["$isCorrect", true] }],
                },
                1,
                0,
              ],
            },
          },
          slowSecondary: {
            $sum: {
              $cond: [
                {
                  $or: [{ $eq: ["$abandoned", true] }, { $eq: ["$isCorrect", false] }],
                },
                1,
                0,
              ],
            },
          },
          fastSecondary: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$attemptedAt", fastCutoff] },
                    {
                      $or: [{ $eq: ["$abandoned", true] }, { $eq: ["$isCorrect", false] }],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ])
    .toArray();
  return result ?? {};
}

async function loadGenerationCounts(slowCutoff: Date, fastCutoff: Date): Promise<DualCounts> {
  const [result] = await getCollection("generationAudits")
    .aggregate<DualCounts>([
      {
        $match: {
          createdAt: { $gte: slowCutoff },
          attemptedGeneration: { $ne: false },
        },
      },
      {
        $group: {
          _id: null,
          slowTotal: { $sum: 1 },
          fastTotal: { $sum: { $cond: [{ $gte: ["$createdAt", fastCutoff] }, 1, 0] } },
          slowPrimary: { $sum: { $cond: [{ $ne: ["$status", "success"] }, 1, 0] } },
          fastPrimary: {
            $sum: {
              $cond: [
                {
                  $and: [{ $gte: ["$createdAt", fastCutoff] }, { $ne: ["$status", "success"] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ])
    .toArray();
  return result ?? {};
}

function buildWindow(input: {
  days: number;
  feedback: DualCounts;
  plays: DualCounts;
  generation: DualCounts;
  prefix: "fast" | "slow";
}): QualityDriftWindow {
  const key = (suffix: "Total" | "Primary" | "Secondary" | "Tertiary") =>
    `${input.prefix}${suffix}` as keyof DualCounts;
  return {
    days: input.days,
    qualityVotes: count(input.feedback[key("Total")]),
    dislikes: count(input.feedback[key("Primary")]),
    unrecognizableReports: count(input.feedback[key("Secondary")]),
    ambiguityOrUnfairReports: count(input.feedback[key("Tertiary")]),
    finalPlays: count(input.plays[key("Total")]),
    solves: count(input.plays[key("Primary")]),
    abandons: count(input.plays[key("Secondary")]),
    generationAttempts: count(input.generation[key("Total")]),
    generationFailuresOrFallbacks: count(input.generation[key("Primary")]),
  };
}

export async function loadQualityDriftReport(input?: {
  now?: Date;
  fastDays?: number;
  slowDays?: number;
}): Promise<QualityDriftReport> {
  const now = input?.now ?? new Date();
  const fastDays = input?.fastDays ?? 7;
  const slowDays = input?.slowDays ?? 28;
  const fastCutoff = new Date(now);
  fastCutoff.setUTCDate(fastCutoff.getUTCDate() - fastDays);
  const slowCutoff = new Date(now);
  slowCutoff.setUTCDate(slowCutoff.getUTCDate() - slowDays);
  const [feedback, plays, generation] = await Promise.all([
    loadFeedbackCounts(slowCutoff, fastCutoff),
    loadPlayCounts(slowCutoff, fastCutoff),
    loadGenerationCounts(slowCutoff, fastCutoff),
  ]);

  return assessQualityDrift({
    fastWindow: buildWindow({ days: fastDays, feedback, plays, generation, prefix: "fast" }),
    slowWindow: buildWindow({ days: slowDays, feedback, plays, generation, prefix: "slow" }),
    now,
  });
}
