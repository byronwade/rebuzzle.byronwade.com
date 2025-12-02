import { NextResponse } from "next/server";
import type { User, UserStats } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * GET /api/admin/users
 * List all users with pagination
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";

    const usersCollection = getCollection<User>("users");
    const userStatsCollection = getCollection<UserStats>("userStats");

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { id: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      usersCollection.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      usersCollection.countDocuments(query),
    ]);

    // Get user stats for each user
    const userIds = users.map((u) => u.id);
    const statsMap = new Map<string, UserStats>();

    if (userIds.length > 0) {
      const stats = await userStatsCollection.find({ userId: { $in: userIds } }).toArray();

      stats.forEach((stat) => {
        statsMap.set(stat.userId, stat);
      });
    }

    // Combine users with their stats
    const usersWithStats = users.map((user) => {
      const stats = statsMap.get(user.id);
      return {
        ...user,
        passwordHash: undefined, // Don't expose password hash
        stats: stats
          ? {
              points: stats.points,
              streak: stats.streak,
              totalGames: stats.totalGames,
              wins: stats.wins,
              level: stats.level,
              dailyChallengeStreak: stats.dailyChallengeStreak,
              lastPlayDate: stats.lastPlayDate,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin users list error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch users",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
