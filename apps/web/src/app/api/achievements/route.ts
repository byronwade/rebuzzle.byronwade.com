/**
 * Achievements API Route
 *
 * GET - Get all achievements with user's unlock status
 * POST - Initialize achievements in database (admin only)
 */

import { type NextRequest, NextResponse } from "next/server";
import { userOps } from "@/db/operations";
import {
  ALL_ACHIEVEMENTS,
  CATEGORY_INFO,
  getAllAchievementsWithStatus,
  getUserAchievementProgress,
  initializeAchievements,
  RARITY_INFO,
} from "@/lib/achievements";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const user = authUser ? await userOps.findById(authUser.userId) : null;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const rarity = searchParams.get("rarity");

    // If user is logged in, get their unlock status
    if (user) {
      const [achievementsWithStatus, progress] = await Promise.all([
        getAllAchievementsWithStatus(user.id),
        getUserAchievementProgress(user.id),
      ]);

      // Filter by category/rarity if specified
      let filteredAchievements = achievementsWithStatus;

      if (category) {
        filteredAchievements = filteredAchievements.filter(
          (a) => a.definition.category === category
        );
      }

      if (rarity) {
        filteredAchievements = filteredAchievements.filter((a) => a.definition.rarity === rarity);
      }

      return NextResponse.json({
        success: true,
        achievements: filteredAchievements.map((a) => ({
          id: a.definition.id,
          name: a.definition.name,
          description: a.definition.secret && !a.unlocked ? "???" : a.definition.description,
          hint:
            a.definition.secret && !a.unlocked ? "This is a secret achievement" : a.definition.hint,
          icon: a.definition.icon,
          category: a.definition.category,
          rarity: a.definition.rarity,
          points: a.definition.points,
          order: a.definition.order,
          secret: a.definition.secret,
          unlocked: a.unlocked,
          unlockedAt: a.unlockedAt,
        })),
        progress,
        categories: CATEGORY_INFO,
        rarities: RARITY_INFO,
      });
    }

    // For non-authenticated users, return all achievements without unlock status
    let achievements = ALL_ACHIEVEMENTS;

    if (category) {
      achievements = achievements.filter((a) => a.category === category);
    }

    if (rarity) {
      achievements = achievements.filter((a) => a.rarity === rarity);
    }

    return NextResponse.json({
      success: true,
      achievements: achievements.map((a) => ({
        id: a.id,
        name: a.secret ? "???" : a.name,
        description: a.secret ? "???" : a.description,
        hint: a.secret ? "This is a secret achievement" : a.hint,
        icon: a.secret ? "star" : a.icon,
        category: a.category,
        rarity: a.rarity,
        points: a.points,
        order: a.order,
        secret: a.secret,
        unlocked: false,
        unlockedAt: null,
      })),
      progress: null,
      categories: CATEGORY_INFO,
      rarities: RARITY_INFO,
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    const user = authUser ? await userOps.findById(authUser.userId) : null;

    // Only admins can initialize achievements
    if (!user?.isAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await initializeAchievements();

    return NextResponse.json({
      success: true,
      message: `Initialized ${ALL_ACHIEVEMENTS.length} achievements`,
    });
  } catch (error) {
    console.error("Error initializing achievements:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initialize achievements" },
      { status: 500 }
    );
  }
}
