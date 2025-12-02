import { NextResponse } from "next/server";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";

/**
 * POST /api/puzzles/attempt
 *
 * Record a puzzle attempt (success or failure)
 * This is called when:
 * 1. User guesses correctly (isCorrect: true)
 * 2. User exhausts all attempts (abandoned: true)
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const {
      puzzleId,
      attemptedAnswer,
      isCorrect,
      abandoned,
      attemptNumber,
      maxAttempts,
      timeSpentSeconds,
      difficulty,
      hintsUsed,
    } = body;

    // Validate required fields
    if (!puzzleId) {
      return NextResponse.json({ success: false, error: "puzzleId is required" }, { status: 400 });
    }

    // Get start of today (UTC) for date comparison
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // ATOMIC: Use findOneAndUpdate with upsert to prevent race conditions
    // This creates a unique attempt per user per day, atomically checking and creating
    const attemptId = crypto.randomUUID();
    const attemptData = {
      id: attemptId,
      userId: user.userId,
      puzzleId,
      attemptedAnswer: attemptedAnswer || "",
      isCorrect: isCorrect ?? false,
      attemptedAt: new Date(),
      abandoned: abandoned ?? false,
      completedAt: isCorrect ? new Date() : undefined,
      attemptNumber: attemptNumber ?? 1,
      maxAttempts: maxAttempts ?? 3,
      timeSpentSeconds: timeSpentSeconds ?? 0,
      difficulty: difficulty,
      hintsUsed: hintsUsed ?? 0,
    };

    // Atomic operation: Only insert if no final attempt exists for this user today
    const result = await db.puzzleAttemptOps.createAtomicDailyAttempt(
      user.userId,
      today,
      attemptData
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Already attempted today's puzzle" },
        { status: 409 }
      );
    }

    const attempt = result.attempt;

    return NextResponse.json({
      success: true,
      attemptId: attempt.id,
      message: isCorrect ? "Puzzle completed!" : abandoned ? "Puzzle failed" : "Attempt recorded",
    });
  } catch (error) {
    console.error("Error recording puzzle attempt:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to record attempt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
