import { NextResponse } from "next/server";
import {
  isPuzzleQualityReason,
  isPuzzleQualityVote,
  mapPuzzleQualityVote,
} from "@/ai/learning/puzzle-quality-vote";
import { aiFeedbackOps } from "@/db/ai-operations";
import { getCollection } from "@/db/mongodb";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";

/**
 * POST /api/puzzles/rating
 *
 * Like / dislike a puzzle (daily or Dev Lab). Feeds AIFeedback puzzle_quality
 * into the self-learning generation loop.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const userLimit = await rateLimit({
      windowMs: 60 * 1000,
      maxRequests: 20,
      keyGenerator: () => getUserKey(`puzzle-rating:${user.userId}`),
    })(request);

    if (userLimit && !userLimit.success) {
      return NextResponse.json({ success: false, error: "Too many ratings" }, { status: 429 });
    }

    const body = (await request.json()) as {
      puzzleId?: string;
      vote?: string;
      solved?: boolean;
      timeSpentSeconds?: number;
      hintsUsed?: number;
      attemptNumber?: number;
      comment?: string;
      source?: string;
      reasons?: unknown[];
    };

    const puzzleId = typeof body.puzzleId === "string" ? body.puzzleId.trim() : "";
    if (!puzzleId || !isPuzzleQualityVote(body.vote)) {
      return NextResponse.json(
        { success: false, error: "Invalid puzzleId or vote" },
        { status: 400 }
      );
    }

    const puzzle = await getCollection("puzzles").findOne(
      { id: puzzleId },
      { projection: { id: 1 } }
    );
    if (!puzzle) {
      return NextResponse.json({ success: false, error: "Puzzle not found" }, { status: 404 });
    }

    const reasons = Array.isArray(body.reasons)
      ? body.reasons.filter(isPuzzleQualityReason).slice(0, 5)
      : [];
    const mapping = mapPuzzleQualityVote(body.vote, reasons);
    const solved = Boolean(body.solved);
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
    const source = typeof body.source === "string" ? body.source.slice(0, 32) : "player";

    const existing = (await getCollection("aiFeedback").findOne({
      userId: user.userId,
      puzzleId,
      feedbackType: "puzzle_quality",
    })) as { id?: string; rating?: number } | null;

    const now = new Date();
    const prevWasLike = typeof existing?.rating === "number" ? existing.rating >= 4 : null;
    const nextIsLike = mapping.vote === "like";

    if (existing?.id) {
      await getCollection("aiFeedback").updateOne(
        { id: existing.id },
        {
          $set: {
            rating: mapping.rating,
            satisfaction: mapping.satisfaction,
            metrics: mapping.metrics,
            comment: typeof body.comment === "string" ? body.comment.slice(0, 500) : undefined,
            context: {
              timeSpentSeconds,
              hintsUsed,
              attemptNumber,
              solved,
            },
            processedForLearning: false,
            timestamp: now,
          },
        }
      );
    } else {
      await aiFeedbackOps.create({
        id: crypto.randomUUID(),
        puzzleId,
        userId: user.userId,
        feedbackType: "puzzle_quality",
        rating: mapping.rating,
        satisfaction: mapping.satisfaction,
        metrics: mapping.metrics,
        comment: typeof body.comment === "string" ? body.comment.slice(0, 500) : undefined,
        context: {
          timeSpentSeconds,
          hintsUsed,
          attemptNumber,
          solved,
        },
        processedForLearning: false,
        timestamp: now,
        createdAt: now,
      });
    }

    await getCollection("puzzleAttempts").updateOne(
      { userId: user.userId, puzzleId, isFinal: true },
      { $set: { userSatisfaction: mapping.satisfaction } }
    );

    const counterInc: Record<string, number> = {};
    if (prevWasLike === null) {
      if (nextIsLike) counterInc["metadata.likes"] = 1;
      else counterInc["metadata.dislikes"] = 1;
    } else if (prevWasLike && !nextIsLike) {
      counterInc["metadata.likes"] = -1;
      counterInc["metadata.dislikes"] = 1;
    } else if (!prevWasLike && nextIsLike) {
      counterInc["metadata.likes"] = 1;
      counterInc["metadata.dislikes"] = -1;
    }

    await getCollection("puzzles").updateOne(
      { id: puzzleId },
      {
        ...(Object.keys(counterInc).length ? { $inc: counterInc } : {}),
        $set: {
          "metadata.lastQualityVoteAt": now.toISOString(),
          "metadata.lastQualityVote": mapping.vote,
          "metadata.qualityVoteSource": source,
        },
      }
    );

    return NextResponse.json({
      success: true,
      vote: mapping.vote,
      updated: Boolean(existing),
    });
  } catch (error) {
    console.error("puzzle rating error:", error);
    return NextResponse.json({ success: false, error: "Failed to record rating" }, { status: 500 });
  }
}
