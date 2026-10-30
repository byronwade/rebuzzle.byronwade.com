import { gameSettings } from "@rebuzzle/config";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { nativeGrowthEventOps } from "@/db/analytics-ops";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import {
  clampHints,
  getArchiveLockKey,
  getLocalPuzzleDate,
  getNextLocalMidnight,
  getUtcPuzzleDate,
} from "@/lib/game/daily-lock";
import { finalizeExtendedDailyRun } from "@/lib/game/extended-daily-finalization";
import { restoreFeedback } from "@/lib/game/restore-feedback";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { resolveRequestTimeZone } from "@/lib/timezone";

const headers = { "Cache-Control": "private, no-store" };
const failure = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status, headers });

/** Restore only the signed-in player's server-persisted guesses for this play scope. */
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !(await db.userOps.findById(user.userId)))
      return failure("Not authenticated", 401);
    const puzzleId = new URL(request.url).searchParams.get("puzzleId")?.trim();
    if (!puzzleId) return failure("puzzleId is required", 400);
    const requestTimeZone = await resolveRequestTimeZone();
    const timeZone = await resolveStableJourneyTimeZone(user.userId, requestTimeZone);
    const restoredAt = new Date();
    const localDate = getLocalPuzzleDate(restoredAt, timeZone);
    const [puzzle, today] = await Promise.all([
      db.puzzleOps.findById(puzzleId),
      db.puzzleOps.findByDate(localDate),
    ]);
    if (!puzzle?.answer) return failure("Puzzle not found", 404);
    const publishedKey = puzzle.publishedAt ? getUtcPuzzleDate(new Date(puzzle.publishedAt)) : null;
    const isDaily = today?.id === puzzle.id && publishedKey === localDate;
    if (isDaily) {
      try {
        await nativeGrowthEventOps.recordOnce({
          userId: user.userId,
          eventType: "daily_session_restored",
          dayKey: localDate,
          occurredAt: restoredAt,
        });
      } catch (error) {
        console.error("[puzzle/session] Daily session restore event write failed", error);
      }
    }
    if (request.headers.get("X-Rebuzzle-Daily-Only") === "true" && !isDaily) {
      return NextResponse.json(
        {
          success: false,
          reloadDaily: true,
          error: "The daily puzzle has changed. Reload today's puzzle to continue.",
        },
        { status: 409, headers }
      );
    }
    const isCommunity =
      puzzle.metadata?.source === "user" && puzzle.metadata?.communityPlayable === true;
    if (!isDaily && !isCommunity && (!publishedKey || publishedKey >= localDate))
      return failure("This puzzle is not playable yet", 403);

    let expiredReview:
      | { puzzleId: string; puzzleDate: string; answer: string; explanation: string }
      | undefined;
    if (isDaily && request.headers.get("X-Rebuzzle-Daily-Only") === "true") {
      try {
        const expiredRuns = await db.puzzleAttemptOps.findExpiredExtendedDailyRuns(
          user.userId,
          localDate
        );
        for (const run of expiredRuns) {
          const expiredPuzzle = await db.puzzleOps.findById(run.puzzleId);
          const difficultyLevel =
            typeof expiredPuzzle?.difficulty === "number"
              ? expiredPuzzle.difficulty
              : expiredPuzzle?.difficulty === "easy"
                ? 3
                : expiredPuzzle?.difficulty === "hard"
                  ? 7
                  : expiredPuzzle?.difficulty === "medium"
                    ? 5
                    : Number(expiredPuzzle?.difficulty) || 5;
          await finalizeExtendedDailyRun({
            userId: user.userId,
            puzzleId: run.puzzleId,
            puzzleDate: run.puzzleDate,
            timeZone,
            difficultyLevel,
            reason: "expired",
            attempts: run.attempts,
          });
        }

        const previousDate = new Date(`${localDate}T00:00:00.000Z`);
        previousDate.setUTCDate(previousDate.getUTCDate() - 1);
        const priorDateKey = previousDate.toISOString().slice(0, 10);
        const expiredAttempt = await db.puzzleAttemptOps.findExpiredExtendedDailyRun(
          user.userId,
          priorDateKey
        );
        if (expiredAttempt) {
          const expiredPuzzle = await db.puzzleOps.findById(expiredAttempt.puzzleId);
          if (expiredPuzzle?.answer) {
            expiredReview = {
              puzzleId: expiredPuzzle.id,
              puzzleDate: expiredAttempt.puzzleDate ?? priorDateKey,
              answer: expiredPuzzle.answer,
              explanation: expiredPuzzle.explanation || "",
            };
          }
        }
      } catch (error) {
        console.error("[puzzle/session] Expired daily finalization failed", error);
      }
    }

    const lockKey = isDaily ? localDate : getArchiveLockKey(puzzle.id);
    const rows = (await db.puzzleAttemptOps.findByUserAndPuzzle(user.userId, puzzle.id))
      .filter(
        (row) =>
          row.userId === user.userId && row.puzzleId === puzzle.id && row.puzzleDate === lockKey
      )
      .sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime());
    const guessRows = rows.filter((row) => row.attemptType !== "finalization");
    const terminalAttempt = rows.find((row) => row.isFinal === true);
    const extendedMode = isDaily && guessRows.some((row) => row.playMode === "extended");
    const scoreLocked = extendedMode && guessRows.length >= gameSettings.maxAttempts;
    if (isDaily) {
      if (terminalAttempt) {
        try {
          await db.dailyProgressOps.materializeFromAttempt(terminalAttempt);
        } catch (error) {
          console.error("[puzzle/session] Journey projection repair failed", error);
          try {
            await db.dailyProgressBackfillOps.requestReconciliation(user.userId);
          } catch (markerError) {
            console.error("[puzzle/session] Journey reconciliation marker failed", markerError);
          }
        }
      }
    }
    const maxAttempts = gameSettings.maxAttempts;
    const wasSuccessful = guessRows.some((row) => row.isCorrect);
    const gameOver =
      rows.some((row) => row.isFinal || row.isCorrect || row.abandoned) ||
      (!extendedMode && guessRows.length >= maxAttempts);
    const phase =
      terminalAttempt?.finalizationReason === "expired"
        ? "expired"
        : terminalAttempt?.finalizationReason === "revealed"
          ? "revealed"
          : wasSuccessful
            ? "solved"
            : gameOver
              ? "exhausted"
              : scoreLocked
                ? guessRows.length > maxAttempts
                  ? "continuing"
                  : "score_locked"
                : "scored";
    return NextResponse.json(
      {
        success: true,
        puzzleId: puzzle.id,
        puzzleDate: publishedKey ?? localDate,
        // The account's journey zone decides the daily reset, not the browser's clock.
        timeZone,
        nextPuzzleTime: getNextLocalMidnight(restoredAt, timeZone).toISOString(),
        attempts: guessRows.map((row, index) => ({
          guess: row.attemptedAnswer,
          correct: row.isCorrect,
          attemptNumber: row.attemptNumber ?? index + 1,
          ...restoreFeedback(row, maxAttempts),
        })),
        hintsUsed: Math.max(
          0,
          ...guessRows.map((row) => clampHints(row.hintsUsed, puzzle.hints?.length ?? 5))
        ),
        attemptsLeft: gameOver ? 0 : Math.max(0, maxAttempts - guessRows.length),
        maxAttempts,
        gameOver,
        wasSuccessful,
        phase,
        scoreLocked,
        playMode: extendedMode ? "extended" : "classic",
        ...(gameOver ? { answer: puzzle.answer, explanation: puzzle.explanation || "" } : {}),
        ...(expiredReview ? { expiredReview } : {}),
      },
      { headers }
    );
  } catch (error) {
    console.error("[puzzle/session] Restore failed", error);
    return failure("Unable to restore puzzle", 500);
  }
}
