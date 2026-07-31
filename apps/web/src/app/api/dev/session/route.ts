/**
 * Temporary Dev Mode APIs — admin only.
 * Lets you regenerate puzzles and walk gated play states while tuning Eve.
 */

import { NextResponse } from "next/server";
import { regenerateTodaysPuzzle } from "@/app/actions/regeneratePuzzleActions";
import { db } from "@/db";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { toPublicPuzzle } from "@/lib/game/public-puzzle";

export async function GET(request: Request) {
  const admin = await verifyAdminAccess(request);
  if (!admin) {
    return NextResponse.json({ success: false, allowed: false }, { status: 403 });
  }

  const puzzleDate = getUtcPuzzleDate();
  const [puzzle, lock] = await Promise.all([
    db.puzzleOps.findTodaysPuzzle(),
    db.puzzleAttemptOps.hasTodayAttempt(admin.id, puzzleDate),
  ]);

  return NextResponse.json({
    success: true,
    allowed: true,
    puzzleDate,
    puzzle: puzzle
      ? toPublicPuzzle({
          id: puzzle.id,
          puzzle: puzzle.puzzle ?? puzzle.rebusPuzzle,
          puzzleType: puzzle.puzzleType ?? "rebus",
          difficulty: puzzle.difficulty,
        })
      : null,
    lock,
  });
}

type DevAction =
  | "clear-attempts"
  | "lock-win"
  | "lock-lose"
  | "regenerate";

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "Admin access required for Dev Mode actions" },
        { status: 403 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: DevAction;
      puzzleType?: string;
    };

    const action = body.action;
    if (!action) {
      return NextResponse.json({ success: false, error: "action required" }, { status: 400 });
    }

    const puzzleDate = getUtcPuzzleDate();

    if (action === "clear-attempts") {
      const deleted = await db.puzzleAttemptOps.clearAttemptsForDate(admin.id, puzzleDate);
      return NextResponse.json({
        success: true,
        action,
        deleted,
        message: `Cleared ${deleted} attempt(s) for ${puzzleDate}`,
      });
    }

    if (action === "lock-win" || action === "lock-lose") {
      const puzzle = await db.puzzleOps.findTodaysPuzzle();
      if (!puzzle) {
        return NextResponse.json(
          { success: false, error: "No puzzle for today — regenerate first" },
          { status: 404 }
        );
      }

      await db.puzzleAttemptOps.clearAttemptsForDate(admin.id, puzzleDate);

      const isWin = action === "lock-win";
      await db.puzzleAttemptOps.create({
        id: crypto.randomUUID(),
        userId: admin.id,
        puzzleId: puzzle.id,
        attemptedAnswer: isWin ? puzzle.answer : "dev-mode-wrong-guess",
        isCorrect: isWin,
        abandoned: !isWin,
        isFinal: true,
        puzzleDate,
        attemptedAt: new Date(),
        completedAt: isWin ? new Date() : undefined,
        attemptNumber: isWin ? 1 : 5,
        maxAttempts: 5,
        timeSpentSeconds: 42,
        hintsUsed: 0,
      });

      return NextResponse.json({
        success: true,
        action,
        message: isWin ? "Locked as WIN for today" : "Locked as LOSS for today",
        puzzleId: puzzle.id,
      });
    }

    if (action === "regenerate") {
      // Clear personal lock so the new puzzle is immediately playable
      await db.puzzleAttemptOps.clearAttemptsForDate(admin.id, puzzleDate);
      const result = await regenerateTodaysPuzzle(body.puzzleType || undefined);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action,
        message: result.message,
        puzzle: result.puzzle
          ? toPublicPuzzle(result.puzzle as Record<string, unknown>)
          : undefined,
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[dev/session]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Dev action failed",
      },
      { status: 500 }
    );
  }
}
