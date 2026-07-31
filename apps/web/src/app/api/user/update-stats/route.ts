import { NextResponse } from "next/server";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

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

      const stats = await db.userStatsOps.findByUserId(authUser.userId);
      if (stats) {
        await db.userStatsOps.updateStats(authUser.userId, {
          sharedResults: (stats.sharedResults || 0) + 1,
        });
      } else {
        // Create initial stats with sharedResults = 1
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
          // Psychological engagement fields
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
