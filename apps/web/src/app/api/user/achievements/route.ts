/**
 * User Achievements API Route
 *
 * GET  - Current user's achievements and progress
 * POST - Only share_result manual awards (game achievements come from /api/puzzles/guess)
 */

import { type NextRequest, NextResponse } from "next/server";
import { userAchievementOps, userOps } from "@/db/operations";
import {
  ALL_ACHIEVEMENTS,
  awardAchievement,
  getAllAchievementsWithStatus,
  getUserAchievementProgress,
} from "@/lib/achievements";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { rateLimiters } from "@/lib/middleware/rate-limit";
import { sendAchievementUnlockedEmail } from "@/lib/notifications/email-service";

/** Achievements that may be claimed from the client (everything else is server-only). */
const CLIENT_AWARDABLE = new Set(["share_first"]);

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const user = authUser ? await userOps.findById(authUser.userId) : null;

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [progress, recentUnlocks, withStatus] = await Promise.all([
      getUserAchievementProgress(user.id),
      userAchievementOps.getRecentUnlocks(user.id, 10),
      getAllAchievementsWithStatus(user.id),
    ]);

    const unlocked = withStatus
      .filter((row) => row.unlocked)
      .map((row) => ({
        id: row.definition.id,
        achievementId: row.definition.id,
        unlockedAt: row.unlockedAt,
        achievement: {
          name: row.definition.name,
          description: row.definition.description,
          icon: row.definition.icon,
          rarity: row.definition.rarity,
          points: row.definition.points,
          category: row.definition.category,
        },
      }));

    return NextResponse.json({
      success: true,
      progress,
      unlocked,
      recentUnlocks: recentUnlocks.map((u) => ({
        id: u.id,
        achievementId: u.achievementId,
        unlockedAt: u.unlockedAt,
        achievement: {
          name: u.achievement.name,
          description: u.achievement.description,
          icon: u.achievement.icon,
          rarity: u.achievement.rarity,
          points: u.achievement.pointsAwarded,
          category: u.achievement.category,
        },
      })),
    });
  } catch (error) {
    console.error("Error fetching user achievements:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch user achievements" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const user = authUser ? await userOps.findById(authUser.userId) : null;

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const limit = await rateLimiters.api(request);
    if (limit && !limit.success) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const { gameContext, manualAward } = body;

    // Client-trusted gameContext is no longer accepted — /api/puzzles/guess awards these.
    if (gameContext) {
      return NextResponse.json(
        {
          success: false,
          error: "Game achievements are awarded automatically via /api/puzzles/guess",
        },
        { status: 403 }
      );
    }

    if (!manualAward) {
      return NextResponse.json({ success: false, error: "Missing manualAward" }, { status: 400 });
    }

    const { achievementId } = manualAward;
    if (!achievementId || typeof achievementId !== "string") {
      return NextResponse.json({ success: false, error: "Invalid achievementId" }, { status: 400 });
    }

    if (!CLIENT_AWARDABLE.has(achievementId)) {
      return NextResponse.json(
        { success: false, error: "This achievement cannot be claimed from the client" },
        { status: 403 }
      );
    }

    const achievement = ALL_ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!achievement) {
      return NextResponse.json(
        { success: false, error: `Achievement not found: ${achievementId}` },
        { status: 404 }
      );
    }

    // share_first: require today's puzzle to be finished first
    if (achievementId === "share_first") {
      const { puzzleAttemptOps } = await import("@/db/operations");
      const lock = await puzzleAttemptOps.hasTodayAttempt(user.id, getUtcPuzzleDate());
      if (!lock.hasAttempt) {
        return NextResponse.json(
          { success: false, error: "Finish today's puzzle before sharing for achievements" },
          { status: 403 }
        );
      }
    }

    const awarded = await awardAchievement(user.id, achievementId);

    if (awarded && !user.isGuest) {
      const progress = await getUserAchievementProgress(user.id);
      await sendAchievementUnlockedEmail(user.email, {
        username: user.username,
        achievementName: achievement.name,
        achievementDescription: achievement.description,
        achievementRarity: achievement.rarity,
        achievementPoints: achievement.points,
        achievementIcon: achievement.icon,
        totalUnlocked: progress.unlocked,
        totalAchievements: progress.total,
      });
    }

    return NextResponse.json({
      success: true,
      awarded,
      achievementId,
    });
  } catch (error) {
    console.error("Error checking achievements:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check achievements" },
      { status: 500 }
    );
  }
}
