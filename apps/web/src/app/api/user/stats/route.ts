import { NextResponse } from "next/server";
import { getUserRank, getUserWithStats } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const timeframe = (searchParams.get("timeframe") || "today") as
      | "today"
      | "week"
      | "month"
      | "allTime";

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Security: Verify the authenticated user matches the requested userId
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || authUser.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, stats } = await getUserWithStats(userId);
    const rank = await getUserRank(userId, timeframe);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
      stats,
      rank,
    });
  } catch (error) {
    console.error("Failed to fetch user stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
