import { gameSettings } from "@rebuzzle/config";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import {
  clampHints,
  getArchiveLockKey,
  getLocalPuzzleDate,
  getUtcPuzzleDate,
} from "@/lib/game/daily-lock";
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
    const localDate = getLocalPuzzleDate(new Date(), timeZone);
    const [puzzle, today] = await Promise.all([
      db.puzzleOps.findById(puzzleId),
      db.puzzleOps.findByDate(localDate),
    ]);
    if (!puzzle?.answer) return failure("Puzzle not found", 404);
    const publishedKey = puzzle.publishedAt ? getUtcPuzzleDate(new Date(puzzle.publishedAt)) : null;
    const isDaily = today?.id === puzzle.id && publishedKey === localDate;
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
    const lockKey = isDaily ? localDate : getArchiveLockKey(puzzle.id);
    const rows = (await db.puzzleAttemptOps.findByUserAndPuzzle(user.userId, puzzle.id))
      .filter(
        (row) =>
          row.userId === user.userId && row.puzzleId === puzzle.id && row.puzzleDate === lockKey
      )
      .sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime());
    if (isDaily) {
      const terminalAttempt = rows.find((row) => row.isFinal === true);
      if (terminalAttempt) {
        try {
          await db.dailyProgressOps.materializeFromAttempt(terminalAttempt);
        } catch (error) {
          console.error("[puzzle/session] Journey projection repair failed", error);
        }
      }
    }
    const maxAttempts = gameSettings.maxAttempts;
    const wasSuccessful = rows.some((row) => row.isCorrect);
    const gameOver =
      rows.some((row) => row.isFinal || row.isCorrect || row.abandoned) ||
      rows.length >= maxAttempts;
    return NextResponse.json(
      {
        success: true,
        puzzleId: puzzle.id,
        puzzleDate: publishedKey ?? localDate,
        attempts: rows.map((row, index) => ({
          guess: row.attemptedAnswer,
          correct: row.isCorrect,
          attemptNumber: row.attemptNumber ?? index + 1,
          ...restoreFeedback(row, maxAttempts),
        })),
        hintsUsed: Math.max(
          0,
          ...rows.map((row) => clampHints(row.hintsUsed, puzzle.hints?.length ?? 5))
        ),
        attemptsLeft: gameOver ? 0 : Math.max(0, maxAttempts - rows.length),
        maxAttempts,
        gameOver,
        wasSuccessful,
        ...(gameOver ? { answer: puzzle.answer, explanation: puzzle.explanation || "" } : {}),
      },
      { headers }
    );
  } catch (error) {
    console.error("[puzzle/session] Restore failed", error);
    return failure("Unable to restore puzzle", 500);
  }
}
