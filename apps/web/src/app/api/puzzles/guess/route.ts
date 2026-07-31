import { gameSettings } from "@rebuzzle/config";
import { after, NextResponse } from "next/server";
import { validateAnswer } from "@/ai/services/answer-validation";
import { db } from "@/db";
import { updateUserStats } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getAchievementDifficultyCategory } from "@/lib/difficulty";
import { buildWordResults } from "@/lib/game/build-word-results";
import {
  clampHints,
  clampTimeSpent,
  getUtcPuzzleDate,
} from "@/lib/game/daily-lock";
import { calculateGamePoints } from "@/lib/gameSettings";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";

const guessRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyGenerator: (request) => {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    return `rate-limit:guess:${ip}`;
  },
});

/**
 * POST /api/puzzles/guess
 *
 * Authoritative daily-puzzle guess handler.
 * - Loads the answer from the DB (never trusts the client)
 * - Enforces attempt budget + one final play per UTC day
 * - Updates stats only after a successful lock write
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const [limit, userLimit, body] = await Promise.all([
      guessRateLimit(request),
      rateLimit({
        windowMs: 60 * 1000,
        maxRequests: 12,
        keyGenerator: () => getUserKey(`guess:${user.userId}`),
      })(request),
      request.json() as Promise<{
        puzzleId?: string;
        guess?: string;
        timeSpentSeconds?: number;
        hintsUsed?: number;
      }>,
    ]);

    if (limit && !limit.success) {
      return NextResponse.json(
        { success: false, error: "Too many guesses. Slow down." },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfter ?? 60),
            "X-RateLimit-Limit": String(limit.limit),
            "X-RateLimit-Remaining": String(limit.remaining),
          },
        }
      );
    }

    if (userLimit && !userLimit.success) {
      return NextResponse.json(
        { success: false, error: "Too many guesses. Slow down." },
        { status: 429 }
      );
    }

    const puzzleId = typeof body.puzzleId === "string" ? body.puzzleId.trim() : "";
    const guess = typeof body.guess === "string" ? body.guess.trim() : "";

    if (!puzzleId || !guess) {
      return NextResponse.json(
        { success: false, error: "puzzleId and guess are required" },
        { status: 400 }
      );
    }

    if (guess.length > 200) {
      return NextResponse.json({ success: false, error: "Guess is too long" }, { status: 400 });
    }

    const puzzleDate = getUtcPuzzleDate();

    // Parallelize puzzle load + today check + attempt context
    const [puzzle, todays, context] = await Promise.all([
      db.puzzleOps.findById(puzzleId),
      db.puzzleOps.findTodaysPuzzle(),
      db.puzzleAttemptOps.getTodayGuessContext(user.userId, puzzleDate),
    ]);

    if (!puzzle?.answer) {
      return NextResponse.json({ success: false, error: "Puzzle not found" }, { status: 404 });
    }

    if (!todays || todays.id !== puzzle.id) {
      return NextResponse.json(
        { success: false, error: "This puzzle is not playable today" },
        { status: 403 }
      );
    }

    const maxAttempts = gameSettings.maxAttempts;

    if (context.hasFinal) {
      return NextResponse.json(
        {
          success: false,
          error: "Already played today",
          locked: true,
          wasSuccessful: context.wasSuccessful,
          attemptsLeft: 0,
          gameOver: true,
        },
        { status: 409 }
      );
    }

    if (context.guessCount >= maxAttempts) {
      return NextResponse.json(
        {
          success: false,
          error: "No attempts remaining",
          locked: true,
          attemptsLeft: 0,
          gameOver: true,
        },
        { status: 409 }
      );
    }

    const attemptNumber = context.guessCount + 1;
    const claimedHints = clampHints(body.hintsUsed, puzzle.hints?.length ?? 5);
    const hintsUsed = Math.max(claimedHints, context.maxHintsUsed);

    const nowMs = Date.now();
    let timeSpentSeconds: number;
    if (context.firstGuessAt) {
      timeSpentSeconds = clampTimeSpent(
        (nowMs - context.firstGuessAt.getTime()) / 1000
      );
    } else {
      timeSpentSeconds = Math.min(clampTimeSpent(body.timeSpentSeconds), 30 * 60);
    }

    const validation = await validateAnswer({
      guess,
      correctAnswer: puzzle.answer,
    });
    const isCorrect = validation.isCorrect;
    const abandoned = !isCorrect && attemptNumber >= maxAttempts;
    const isFinal = isCorrect || abandoned;
    const attemptsLeft = isCorrect ? 0 : Math.max(0, maxAttempts - attemptNumber);
    const wordResults = buildWordResults(guess, puzzle.answer);
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

    const write = await db.puzzleAttemptOps.createAtomicDailyAttempt(
      user.userId,
      new Date(`${puzzleDate}T00:00:00.000Z`),
      {
        id: crypto.randomUUID(),
        userId: user.userId,
        puzzleId: puzzle.id,
        attemptedAnswer: guess,
        isCorrect,
        abandoned,
        isFinal,
        puzzleDate,
        attemptedAt: new Date(),
        completedAt: isCorrect ? new Date() : undefined,
        attemptNumber,
        maxAttempts,
        timeSpentSeconds,
        difficulty: getAchievementDifficultyCategory(difficultyLevel),
        hintsUsed,
      }
    );

    if (!write.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Already played today",
          locked: true,
          wasSuccessful: write.attempt.isCorrect,
          attemptsLeft: 0,
          gameOver: true,
        },
        { status: 409 }
      );
    }

    let pointsEarned = 0;
    if (isFinal && isCorrect) {
      // Cheap estimate for immediate UI; authoritative stats update after response
      pointsEarned = calculateGamePoints(
        attemptNumber,
        timeSpentSeconds,
        1,
        difficultyLevel
      );
    }

    if (isFinal) {
      const uid = user.userId;
      const pid = puzzle.id;
      after(async () => {
        try {
          await updateUserStats(uid, {
            won: isCorrect,
            attempts: attemptNumber,
            timeSpent: timeSpentSeconds,
            difficulty: difficultyLevel,
          });

          if (isCorrect) {
            const stats = await db.userStatsOps.findByUserId(uid);
            const score = calculateGamePoints(
              attemptNumber,
              timeSpentSeconds,
              stats?.streak ?? 1,
              difficultyLevel
            );
            const { checkAndAwardAchievements } = await import("@/lib/achievements/service");
            await checkAndAwardAchievements(uid, {
              puzzleId: pid,
              attempts: attemptNumber,
              maxAttempts,
              timeTaken: timeSpentSeconds,
              hintsUsed,
              difficulty: getAchievementDifficultyCategory(difficultyLevel),
              isCorrect: true,
              score,
            });
          }
        } catch (error) {
          console.error("[guess] post-response update failed:", error);
        }
      });
    }

    return NextResponse.json({
      success: true,
      correct: isCorrect,
      similarity: Math.round((validation.confidence ?? 0) * 100),
      method: validation.method,
      attemptNumber,
      attemptsLeft,
      maxAttempts,
      gameOver: isFinal,
      locked: isFinal,
      wordResults,
      ...(isFinal
        ? {
            answer: puzzle.answer,
            explanation: puzzle.explanation || "",
            pointsEarned,
            wasSuccessful: isCorrect,
          }
        : {}),
    });
  } catch (error) {
    console.error("[guess] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process guess",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
