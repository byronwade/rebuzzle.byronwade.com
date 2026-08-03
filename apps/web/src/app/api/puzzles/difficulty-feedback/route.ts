import { NextResponse } from "next/server";
import {
  isDifficultyPerceptionChoice,
  mapDifficultyPerception,
} from "@/ai/learning/difficulty-perception";
import { aiFeedbackOps } from "@/db/ai-operations";
import { getCollection } from "@/db/mongodb";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";

/**
 * POST /api/puzzles/difficulty-feedback
 *
 * Capture explicit post-solve difficulty perception (too easy / just right / too hard).
 * Feeds AIFeedback + the final puzzleAttempt for the self-learning loop.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const userLimit = await rateLimit({
      windowMs: 60 * 1000,
      maxRequests: 8,
      keyGenerator: () => getUserKey(`difficulty-feedback:${user.userId}`),
    })(request);

    if (userLimit && !userLimit.success) {
      return NextResponse.json(
        { success: false, error: "Too many feedback submissions" },
        { status: 429 }
      );
    }

    const body = (await request.json()) as {
      puzzleId?: string;
      perception?: string;
      solved?: boolean;
      timeSpentSeconds?: number;
      hintsUsed?: number;
      attemptNumber?: number;
    };

    const puzzleId = typeof body.puzzleId === "string" ? body.puzzleId.trim() : "";
    if (!puzzleId || !isDifficultyPerceptionChoice(body.perception)) {
      return NextResponse.json(
        { success: false, error: "Invalid puzzleId or perception" },
        { status: 400 }
      );
    }

    const mapping = mapDifficultyPerception(body.perception);
    const solved = body.solved !== false;
    const timeSpentSeconds =
      typeof body.timeSpentSeconds === "number" && body.timeSpentSeconds > 0
        ? Math.min(body.timeSpentSeconds, 7200)
        : 0;
    const hintsUsed =
      typeof body.hintsUsed === "number" && body.hintsUsed >= 0 ? Math.min(body.hintsUsed, 20) : 0;
    const attemptNumber =
      typeof body.attemptNumber === "number" && body.attemptNumber > 0
        ? Math.min(body.attemptNumber, 20)
        : 1;

    // One perception vote per user per puzzle
    const existing = await getCollection("aiFeedback").findOne({
      userId: user.userId,
      puzzleId,
      feedbackType: "difficulty_accuracy",
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        perception: body.perception,
      });
    }

    const now = new Date();
    await aiFeedbackOps.create({
      id: crypto.randomUUID(),
      puzzleId,
      userId: user.userId,
      feedbackType: "difficulty_accuracy",
      rating: mapping.rating,
      satisfaction: mapping.satisfaction,
      metrics: mapping.metrics,
      context: {
        timeSpentSeconds,
        hintsUsed,
        attemptNumber,
        solved,
        difficultyPerception: mapping.difficultyPerception,
      },
      processedForLearning: false,
      timestamp: now,
      createdAt: now,
    });

    // Patch the final attempt when present
    await getCollection("puzzleAttempts").updateOne(
      { userId: user.userId, puzzleId, isFinal: true },
      {
        $set: {
          difficultyPerception: mapping.difficultyPerception,
          userSatisfaction: mapping.satisfaction,
        },
      }
    );

    return NextResponse.json({
      success: true,
      perception: body.perception,
      learningDeltaHint: mapping.learningDeltaHint,
    });
  } catch (error) {
    console.error("difficulty-feedback error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record feedback" },
      { status: 500 }
    );
  }
}
