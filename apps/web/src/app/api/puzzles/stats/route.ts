/**
 * Puzzle Statistics API
 *
 * Returns daily statistics for puzzles including:
 * - Number of players who solved today
 * - Average solve time
 * - Solve time distribution for percentile calculation
 */

import { NextResponse } from "next/server";
import { ensureConnection, getCollection } from "@/db/mongodb";

interface PuzzleStats {
  todaySolves: number;
  averageSolveTime: number;
  averageAttempts: number;
  solveTimeDistribution: number[]; // Array of solve times for percentile calc
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const puzzleId = searchParams.get("puzzleId");

    await ensureConnection();
    const attemptsCollection = getCollection("puzzleAttempts");

    // Get today's date range (UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Build query for today's successful attempts
    const query: Record<string, unknown> = {
      isCorrect: true,
      attemptedAt: {
        $gte: today,
        $lt: tomorrow,
      },
    };

    // If puzzleId provided, filter by it
    if (puzzleId) {
      query.puzzleId = puzzleId;
    }

    // Get all successful attempts today
    const attempts = await attemptsCollection
      .find(query)
      .project({
        timeSpentSeconds: 1,
        attemptNumber: 1,
        userId: 1,
      })
      .toArray();

    // Count unique users who solved (not duplicate attempts)
    const uniqueUsers = new Set(attempts.map((a) => a.userId));
    const todaySolves = uniqueUsers.size;

    // Calculate averages
    const validTimes = attempts
      .filter((a) => typeof a.timeSpentSeconds === "number" && a.timeSpentSeconds > 0)
      .map((a) => a.timeSpentSeconds as number);

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

    // Return solve times sorted for percentile calculation
    const solveTimeDistribution = validTimes.sort((a, b) => a - b);

    const stats: PuzzleStats = {
      todaySolves,
      averageSolveTime,
      averageAttempts,
      solveTimeDistribution,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching puzzle stats:", error);
    return NextResponse.json({ error: "Failed to fetch puzzle statistics" }, { status: 500 });
  }
}
