import { gameSettings } from "@rebuzzle/config";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getLocalPuzzleDate } from "@/lib/game/daily-lock";
import { finalizeExtendedDailyRun } from "@/lib/game/extended-daily-finalization";
import { restoreFeedback } from "@/lib/game/restore-feedback";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";
import { resolveRequestTimeZone } from "@/lib/timezone";

const headers = { "Cache-Control": "private, no-store" };
const json = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status, headers });

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return json({ success: false, error: "Not authenticated" }, 401);

    const [ipLimit, userLimit] = await Promise.all([
      rateLimit({
        windowMs: 60 * 1000,
        maxRequests: 20,
        keyGenerator: (value) => {
          const forwarded = value.headers.get("x-forwarded-for");
          const ip = forwarded?.split(",")[0]?.trim() || "unknown";
          return `rate-limit:daily-reveal:${ip}`;
        },
      })(request),
      rateLimit({
        windowMs: 60 * 1000,
        maxRequests: 12,
        keyGenerator: () => getUserKey(`daily-reveal:${user.userId}`),
      })(request),
    ]);
    if ((ipLimit && !ipLimit.success) || (userLimit && !userLimit.success)) {
      return json({ success: false, error: "Too many reveals. Slow down." }, 429);
    }

    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return json({ success: false, error: "Invalid request body" }, 400);
    }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return json({ success: false, error: "Invalid request body" }, 400);
    }
    const puzzleId = (input as Record<string, unknown>).puzzleId;
    if (typeof puzzleId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(puzzleId.trim())) {
      return json({ success: false, error: "Invalid puzzle ID" }, 400);
    }

    const requestTimeZone = await resolveRequestTimeZone();
    const timeZone = await resolveStableJourneyTimeZone(user.userId, requestTimeZone);
    const localDate = getLocalPuzzleDate(new Date(), timeZone);
    const [puzzle, today] = await Promise.all([
      db.puzzleOps.findById(puzzleId.trim()),
      db.puzzleOps.findByDate(localDate),
    ]);
    if (!puzzle?.answer) return json({ success: false, error: "Puzzle not found" }, 404);
    const publishedKey = puzzle.publishedAt
      ? new Date(puzzle.publishedAt).toISOString().slice(0, 10)
      : null;
    if (!today || today.id !== puzzle.id || publishedKey !== localDate) {
      return json(
        {
          success: false,
          reloadDaily: true,
          error: "The daily puzzle has changed. Reload today's puzzle to continue.",
        },
        409
      );
    }

    const context = await db.puzzleAttemptOps.getTodayGuessContext(user.userId, localDate);
    const rows = (await db.puzzleAttemptOps.findByUserAndPuzzle(user.userId, puzzle.id))
      .filter(
        (row) =>
          row.userId === user.userId && row.puzzleId === puzzle.id && row.puzzleDate === localDate
      )
      .sort((a, b) => new Date(a.attemptedAt).getTime() - new Date(b.attemptedAt).getTime());
    const guessRows = rows.filter((row) => row.attemptType !== "finalization");
    const terminal = rows.find((row) => row.isFinal === true);
    const maxAttempts = gameSettings.maxAttempts;

    if (terminal) {
      const phase =
        terminal.finalizationReason === "revealed"
          ? "revealed"
          : terminal.isCorrect
            ? "solved"
            : "exhausted";
      return json({
        success: true,
        puzzleId: puzzle.id,
        puzzleDate: localDate,
        phase,
        scoreLocked: context.playMode === "extended",
        correct: Boolean(terminal.isCorrect),
        wasSuccessful: Boolean(terminal.isCorrect),
        gameOver: true,
        attempts: guessRows.map((row, index) => ({
          guess: row.attemptedAnswer,
          correct: row.isCorrect,
          attemptNumber: row.attemptNumber ?? index + 1,
          ...restoreFeedback(row, maxAttempts),
        })),
        attemptsLeft: 0,
        maxAttempts,
        answer: puzzle.answer,
        explanation: puzzle.explanation || "",
        pointsEarned: 0,
      });
    }

    if (context.playMode !== "extended" || context.guessCount < maxAttempts) {
      return json(
        {
          success: false,
          error: "Finish the three scored guesses before revealing the answer.",
          scoreLocked: false,
          attemptsLeft: Math.max(0, maxAttempts - context.guessCount),
        },
        409
      );
    }

    const difficultyLevel =
      typeof puzzle.difficulty === "number"
        ? puzzle.difficulty
        : puzzle.difficulty === "easy"
          ? 3
          : puzzle.difficulty === "hard"
            ? 7
            : puzzle.difficulty === "medium"
              ? 5
              : Number(puzzle.difficulty) || 5;
    const finalAttempt = await finalizeExtendedDailyRun({
      userId: user.userId,
      puzzleId: puzzle.id,
      puzzleDate: localDate,
      timeZone,
      difficultyLevel,
      reason: "revealed",
      attempts: rows,
    });
    if (!finalAttempt?.isFinal) {
      return json({ success: false, error: "The puzzle could not be finalized. Try again." }, 409);
    }

    // A continuation solve may win the final attempt slot while this reveal
    // request is in flight. The atomic insert returns that solved guess; keep
    // the response aligned with the result that actually won the race.
    const solvedConcurrently =
      finalAttempt.attemptType === "guess" && finalAttempt.isCorrect === true;
    const terminalAttempts = solvedConcurrently ? [...guessRows, finalAttempt] : guessRows;
    const phase = solvedConcurrently
      ? "solved"
      : finalAttempt.finalizationReason === "revealed"
        ? "revealed"
        : finalAttempt.finalizationReason === "expired"
          ? "expired"
          : "exhausted";

    return json({
      success: true,
      puzzleId: puzzle.id,
      puzzleDate: localDate,
      phase,
      scoreLocked: true,
      correct: solvedConcurrently,
      wasSuccessful: solvedConcurrently,
      gameOver: true,
      attempts: terminalAttempts.map((row, index) => ({
        guess: row.attemptedAnswer,
        correct: row.isCorrect,
        attemptNumber: row.attemptNumber ?? index + 1,
        ...restoreFeedback(row, maxAttempts),
      })),
      attemptsLeft: 0,
      maxAttempts,
      answer: puzzle.answer,
      explanation: puzzle.explanation || "",
      pointsEarned: 0,
    });
  } catch (error) {
    console.error("[daily/reveal] Unable to reveal score-locked puzzle:", error);
    return json({ success: false, error: "Unable to reveal the answer right now." }, 500);
  }
}
