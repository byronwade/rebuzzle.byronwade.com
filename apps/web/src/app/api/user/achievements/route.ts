/**
 * User Achievements API Route
 *
 * GET - Get current user's achievements and progress
 * POST - Award achievement to user (after game completion)
 */

import { type NextRequest, NextResponse } from "next/server";
import { userAchievementOps, userOps } from "@/db/operations";
import {
  ALL_ACHIEVEMENTS,
  awardAchievement,
  checkAndAwardAchievements,
  type GameContext,
  getUserAchievementProgress,
} from "@/lib/achievements";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { sendAchievementUnlockedEmail } from "@/lib/notifications/email-service";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const user = authUser ? await userOps.findById(authUser.userId) : null;

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const [progress, recentUnlocks] = await Promise.all([
      getUserAchievementProgress(user.id),
      userAchievementOps.getRecentUnlocks(user.id, 10),
    ]);

    return NextResponse.json({
      success: true,
      progress,
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

    const body = await request.json();
    const { gameContext, manualAward } = body;

    // Manual award (for special achievements like share_result)
    if (manualAward) {
      const { achievementId } = manualAward;

      // Validate achievement ID exists
      if (!achievementId || typeof achievementId !== "string") {
        return NextResponse.json(
          { success: false, error: "Invalid achievementId" },
          { status: 400 }
        );
      }

      // Verify achievement exists in definitions
      const achievement = ALL_ACHIEVEMENTS.find((a) => a.id === achievementId);
      if (!achievement) {
        return NextResponse.json(
          { success: false, error: `Achievement not found: ${achievementId}` },
          { status: 404 }
        );
      }

      const awarded = await awardAchievement(user.id, achievementId);

      if (awarded && !user.isGuest) {
        // Send email notification
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
    }

    // Check and award achievements after game completion
    if (gameContext) {
      // Validate required gameContext fields
      if (
        typeof gameContext.puzzleId !== "string" ||
        typeof gameContext.attempts !== "number" ||
        typeof gameContext.isCorrect !== "boolean"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid gameContext: puzzleId (string), attempts (number), and isCorrect (boolean) are required",
          },
          { status: 400 }
        );
      }

      // Validate attempts is positive and within bounds
      if (gameContext.attempts < 1 || gameContext.attempts > 10) {
        return NextResponse.json(
          { success: false, error: "Invalid attempts: must be between 1 and 10" },
          { status: 400 }
        );
      }

      const context: GameContext = {
        puzzleId: gameContext.puzzleId,
        attempts: gameContext.attempts,
        maxAttempts: Math.min(Math.max(gameContext.maxAttempts || 5, 1), 10),
        timeTaken: gameContext.timeTaken,
        hintsUsed: gameContext.hintsUsed || 0,
        difficulty: gameContext.difficulty || "medium",
        isCorrect: gameContext.isCorrect,
        score: gameContext.score || 0,
      };

      const result = await checkAndAwardAchievements(user.id, context);

      // Send email notifications for newly unlocked achievements (non-guests only)
      if (result.newlyUnlocked.length > 0 && !user.isGuest) {
        const progress = await getUserAchievementProgress(user.id);

        // Send emails for each new achievement (in background)
        for (const achievement of result.newlyUnlocked) {
          sendAchievementUnlockedEmail(user.email, {
            username: user.username,
            achievementName: achievement.name,
            achievementDescription: achievement.description,
            achievementRarity: achievement.rarity,
            achievementPoints: achievement.points,
            achievementIcon: achievement.icon,
            totalUnlocked: progress.unlocked,
            totalAchievements: progress.total,
          })
            .then(() => {
              // Mark email as sent
              userAchievementOps.markEmailSent(user.id, achievement.id);
            })
            .catch((err) => {
              console.error(`Failed to send achievement email for ${achievement.id}:`, err);
            });
        }
      }

      return NextResponse.json({
        success: true,
        newlyUnlocked: result.newlyUnlocked.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          rarity: a.rarity,
          points: a.points,
        })),
        totalNewPoints: result.newlyUnlocked.reduce((sum, a) => sum + a.points, 0),
      });
    }

    return NextResponse.json(
      { success: false, error: "Missing gameContext or manualAward" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error checking achievements:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check achievements" },
      { status: 500 }
    );
  }
}
