import { NextResponse } from "next/server";
import { db } from "@/db";
import { updateUserStats } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

/**
 * Validates the gameResult object structure
 */
function isValidGameResult(gameResult: unknown): gameResult is {
  won: boolean;
  attempts: number;
  timeSpent?: number;
  difficulty?: number;
} {
  if (!gameResult || typeof gameResult !== "object") {
    return false;
  }

  const result = gameResult as Record<string, unknown>;

  // Required: won must be boolean
  if (typeof result.won !== "boolean") {
    return false;
  }

  // Required: attempts must be a positive integer
  if (
    typeof result.attempts !== "number" ||
    !Number.isInteger(result.attempts) ||
    result.attempts < 1
  ) {
    return false;
  }

  // Optional: timeSpent must be a non-negative number if provided
  if (
    result.timeSpent !== undefined &&
    (typeof result.timeSpent !== "number" || result.timeSpent < 0)
  ) {
    return false;
  }

  // Optional: difficulty must be a number between 1-10 if provided
  if (
    result.difficulty !== undefined &&
    (typeof result.difficulty !== "number" || result.difficulty < 1 || result.difficulty > 10)
  ) {
    return false;
  }

  return true;
}

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

    // Handle regular game result update
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Valid user ID is required" }, { status: 400 });
    }

    // Security: Verify authenticated user matches the userId being updated
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || authUser.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isValidGameResult(gameResult)) {
      return NextResponse.json(
        {
          error: "Invalid game result",
          details:
            "gameResult must have: won (boolean), attempts (positive integer), and optionally timeSpent (number >= 0) and difficulty (1-10)",
        },
        { status: 400 }
      );
    }

    const success = await updateUserStats(userId, gameResult);

    if (!success) {
      return NextResponse.json({ error: "Failed to update user stats" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "User stats updated successfully",
    });
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
