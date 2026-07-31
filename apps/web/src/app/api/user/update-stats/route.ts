import { NextResponse } from "next/server";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getUserKey, rateLimit, rateLimiters } from "@/lib/middleware/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, gameResult, incrementSharedResults } = body;

    // Handle incrementSharedResults (for share tracking)
    if (incrementSharedResults) {
      const authUser = await getAuthenticatedUser(request);
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const limit = await rateLimiters.api(request);
      if (limit && !limit.success) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }

      // Cap share spam: a few per minute per user is plenty
      const shareLimiter = rateLimit({
        windowMs: 60 * 1000,
        maxRequests: 3,
        keyGenerator: () => getUserKey(`share:${authUser.userId}`),
      });
      const shareLimit = await shareLimiter(request);
      if (shareLimit && !shareLimit.success) {
        return NextResponse.json({ error: "Too many share updates" }, { status: 429 });
      }

      const stats = await db.userStatsOps.findByUserId(authUser.userId);
      if (stats) {
        await db.userStatsOps.updateStats(authUser.userId, {
          sharedResults: (stats.sharedResults || 0) + 1,
        });
      } else {
        await db.userStatsOps.create({
          id: `stats_${authUser.userId}`,
          userId: authUser.userId,
          points: 0,
          streak: 0,
          maxStreak: 0,
          totalGames: 0,
          wins: 0,
          level: 1,
          dailyChallengeStreak: 0,
          perfectSolves: 0,
          clutchSolves: 0,
          speedSolves: 0,
          totalTimePlayed: 0,
          noHintStreak: 0,
          maxNoHintStreak: 0,
          consecutivePerfect: 0,
          maxConsecutivePerfect: 0,
          weekendSolves: 0,
          easyPuzzlesSolved: 0,
          mediumPuzzlesSolved: 0,
          hardPuzzlesSolved: 0,
          sharedResults: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          streakFreezes: 1,
          streakShields: 0,
          luckySolveCount: 0,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Shared results incremented",
      });
    }

    // Game win/loss stats are applied only by /api/puzzles/guess after a
    // server-side daily lock. This endpoint only accepts share increments.
    if (userId || gameResult) {
      return NextResponse.json(
        {
          success: false,
          error: "Game results must be submitted via /api/puzzles/guess",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update user stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
