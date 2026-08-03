/**
 * Temporary Dev Mode APIs.
 * Available to any signed-in user (including guests) while testing.
 * Do not ship long-term without tightening access again.
 */

import { NextResponse } from "next/server";
import { getGatewayAuthDiagnostics, probeGatewayAuth } from "@/ai/client";
import { regenerateTodaysPuzzle } from "@/app/actions/regeneratePuzzleActions";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getUtcPuzzleDate } from "@/lib/game/daily-lock";
import { toPublicPuzzle } from "@/lib/game/public-puzzle";
import { buildCacheControl } from "@/lib/http/cache-headers";

export async function GET(request: Request) {
  const authUser = await getAuthenticatedUser(request);
  if (!authUser) {
    return NextResponse.json(
      { success: false, allowed: false },
      { status: 401, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }

  const puzzleDate = getUtcPuzzleDate();
  const [puzzle, lock] = await Promise.all([
    db.puzzleOps.findTodaysPuzzle(),
    db.puzzleAttemptOps.hasTodayAttempt(authUser.userId, puzzleDate),
  ]);

  return NextResponse.json(
    {
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
      gateway: getGatewayAuthDiagnostics(),
    },
    { headers: { "Cache-Control": buildCacheControl({ private: true }) } }
  );
}

type DevAction = "clear-attempts" | "lock-win" | "lock-lose" | "regenerate";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: "Sign in (guest or account) to use Dev Mode actions" },
        { status: 401, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: DevAction;
      puzzleType?: string;
    };

    const action = body.action;
    if (!action) {
      return NextResponse.json(
        { success: false, error: "action required" },
        { status: 400, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
      );
    }

    const puzzleDate = getUtcPuzzleDate();
    const userId = authUser.userId;

    if (action === "clear-attempts") {
      const deleted = await db.puzzleAttemptOps.clearAttemptsForDate(userId, puzzleDate);
      return NextResponse.json(
        {
          success: true,
          action,
          deleted,
          message: `Cleared ${deleted} attempt(s) for ${puzzleDate}`,
        },
        { headers: { "Cache-Control": buildCacheControl({ private: true }) } }
      );
    }

    if (action === "lock-win" || action === "lock-lose") {
      const puzzle = await db.puzzleOps.findTodaysPuzzle();
      if (!puzzle) {
        return NextResponse.json(
          { success: false, error: "No puzzle for today — regenerate first" },
          { status: 404, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
        );
      }

      await db.puzzleAttemptOps.clearAttemptsForDate(userId, puzzleDate);

      const isWin = action === "lock-win";
      await db.puzzleAttemptOps.create({
        id: crypto.randomUUID(),
        userId,
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

      return NextResponse.json(
        {
          success: true,
          action,
          message: isWin ? "Locked as WIN for today" : "Locked as LOSS for today",
          puzzleId: puzzle.id,
        },
        { headers: { "Cache-Control": buildCacheControl({ private: true }) } }
      );
    }

    if (action === "regenerate") {
      // Fail fast with an actionable message before deleting today's puzzle
      const authProbe = await probeGatewayAuth();
      if (!authProbe.ok) {
        return NextResponse.json(
          {
            success: false,
            error: authProbe.error,
            gateway: authProbe.diagnostics,
          },
          { status: 503, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
        );
      }

      // Clear personal lock so the new puzzle is immediately playable
      await db.puzzleAttemptOps.clearAttemptsForDate(userId, puzzleDate);
      const result = await regenerateTodaysPuzzle(body.puzzleType || undefined);
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.message,
            gateway: getGatewayAuthDiagnostics(),
          },
          { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
        );
      }

      return NextResponse.json(
        {
          success: true,
          action,
          message: result.message,
          puzzle: result.puzzle
            ? toPublicPuzzle(result.puzzle as Record<string, unknown>)
            : undefined,
          gateway: authProbe.diagnostics,
        },
        { headers: { "Cache-Control": buildCacheControl({ private: true }) } }
      );
    }

    return NextResponse.json(
      { success: false, error: "Unknown action" },
      { status: 400, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  } catch (error) {
    console.error("[dev/session]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Dev action failed",
      },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }
}
