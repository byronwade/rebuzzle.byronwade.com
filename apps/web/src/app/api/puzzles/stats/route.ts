/**
 * Puzzle Statistics API
 *
 * Aggregates only — no raw solve-time dumps (privacy + payload size).
 */

import { NextResponse } from "next/server";
import { ensureConnection, getCollection } from "@/db/mongodb";
import { getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { buildCacheControl } from "@/lib/http/cache-headers";
import { rateLimiters } from "@/lib/middleware/rate-limit";

interface PuzzleStats {
  todaySolves: number;
  averageSolveTime: number;
  averageAttempts: number;
  /** Percentile buckets for client comparison (not raw times) */
  percentiles: { p25: number; p50: number; p75: number; p90: number };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

export async function GET(request: Request) {
  try {
    const limit = await rateLimiters.public(request);
    if (limit && !limit.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Cache-Control": buildCacheControl({
              private: true,
            }),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const puzzleId = searchParams.get("puzzleId");

    await ensureConnection();
    const attemptsCollection = getCollection("puzzleAttempts");

    const dateKey = getUtcPuzzleDate();
    const today = new Date(`${dateKey}T00:00:00.000Z`);
    const tomorrow = new Date(`${dateKey}T23:59:59.999Z`);

    const query: Record<string, unknown> = {
      isCorrect: true,
      $or: [
        { puzzleDate: dateKey },
        {
          attemptedAt: {
            $gte: today,
            $lte: tomorrow,
          },
        },
      ],
    };

    if (puzzleId) {
      query.puzzleId = puzzleId;
    }

    const attempts = await attemptsCollection
      .find(query)
      .project({
        timeSpentSeconds: 1,
        attemptNumber: 1,
        userId: 1,
      })
      .limit(5000)
      .toArray();

    const uniqueUsers = new Set(attempts.map((a) => a.userId));
    const todaySolves = uniqueUsers.size;

    const validTimes = attempts
      .filter((a) => typeof a.timeSpentSeconds === "number" && a.timeSpentSeconds > 0)
      .map((a) => a.timeSpentSeconds as number)
      .sort((a, b) => a - b);

    const validAttempts = attempts
      .filter((a) => typeof a.attemptNumber === "number")
      .map((a) => a.attemptNumber as number);

    const averageSolveTime =
      validTimes.length > 0
        ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
        : 0;

    const averageAttempts =
      validAttempts.length > 0
        ? Math.round((validAttempts.reduce((a, b) => a + b, 0) / validAttempts.length) * 10) / 10
        : 0;

    const stats: PuzzleStats = {
      todaySolves,
      averageSolveTime,
      averageAttempts,
      percentiles: {
        p25: percentile(validTimes, 25),
        p50: percentile(validTimes, 50),
        p75: percentile(validTimes, 75),
        p90: percentile(validTimes, 90),
      },
    };

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": buildCacheControl({
          public: true,
          maxAge: 30,
          sMaxAge: 60,
          staleWhileRevalidate: 120,
        }),
      },
    });
  } catch (error) {
    console.error("Error fetching puzzle stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch puzzle statistics" },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }
}
