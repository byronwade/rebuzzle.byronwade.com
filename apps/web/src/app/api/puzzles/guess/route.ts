import { gameSettings } from "@rebuzzle/config";
import { NextResponse } from "next/server";
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

    const limit = await guessRateLimit(request);
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

    // Per-user budget as well (shared IPs / guests)
    const userLimiter = rateLimit({
      windowMs: 60 * 1000,
      maxRequests: 12,
      keyGenerator: () => getUserKey(`guess:${user.userId}`),
    });
    const userLimit = await userLimiter(request);
    if (userLimit && !userLimit.success) {
      return NextResponse.json(
        { success: false, error: "Too many guesses. Slow down." },
        { status: 429 }
      );
    }

    const body = (await request.json()) as {
      puzzleId?: string;
      guess?: string;
      timeSpentSeconds?: number;
      hintsUsed?: number;
    };

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

    const puzzle = await db.puzzleOps.findById(puzzleId);
    if (!puzzle?.answer) {
      return NextResponse.json({ success: false, error: "Puzzle not found" }, { status: 404 });
    }

    // Only today's active puzzle can be played for score/lock
    const puzzleDate = getUtcPuzzleDate();
    const todays = await db.puzzleOps.findTodaysPuzzle();
    if (!todays || todays.id !== puzzle.id) {
      return NextResponse.json(
        { success: false, error: "This puzzle is not playable today" },
        { status: 403 }
      );
    }

    const maxAttempts = gameSettings.maxAttempts;
    const lock = await db.puzzleAttemptOps.hasTodayAttempt(user.userId, puzzleDate);
    if (lock.hasAttempt) {
      return NextResponse.json(
        {
          success: false,
          error: "Already played today",
          locked: true,
          wasSuccessful: lock.wasSuccessful,
          attemptsLeft: 0,
          gameOver: true,
        },
        { status: 409 }
      );
    }

    const priorGuesses = await db.puzzleAttemptOps.countTodayGuesses(user.userId, puzzleDate);
    if (priorGuesses >= maxAttempts) {
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

    const attemptNumber = priorGuesses + 1;
    const claimedHints = clampHints(body.hintsUsed, puzzle.hints?.length ?? 5);
    const priorMaxHints = await db.puzzleAttemptOps.maxHintsUsedToday(
      user.userId,
      puzzleDate
    );
    // Never allow under-reporting below what was already claimed today
    const hintsUsed = Math.max(claimedHints, priorMaxHints);

    // Prefer server-elapsed time from the first guess of the day
    const firstGuess = await db.puzzleAttemptOps.findFirstGuessToday(
      user.userId,
      puzzleDate
    );
    const nowMs = Date.now();
    let timeSpentSeconds: number;
    if (firstGuess?.attemptedAt) {
      timeSpentSeconds = clampTimeSpent(
        (nowMs - new Date(firstGuess.attemptedAt).getTime()) / 1000
      );
    } else {
      // First guess of the day: accept client clock but hard-cap at 30 minutes
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

    const attemptData = {
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
    };

    const write = await db.puzzleAttemptOps.createAtomicDailyAttempt(
      user.userId,
      new Date(`${puzzleDate}T00:00:00.000Z`),
      attemptData
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
    if (isFinal && write.success) {
      // Stats only update when the daily lock write succeeded
      await updateUserStats(user.userId, {
        won: isCorrect,
        attempts: attemptNumber,
        timeSpent: timeSpentSeconds,
        difficulty: difficultyLevel,
      });

      if (isCorrect) {
        // Approximate streak for response scoring; updateUserStats already persisted truth
        const stats = await db.userStatsOps.findByUserId(user.userId);
        pointsEarned = calculateGamePoints(
          attemptNumber,
          timeSpentSeconds,
          stats?.streak ?? 1,
          difficultyLevel
        );

        // Achievements — best-effort, don't fail the guess
        try {
          const { checkAndAwardAchievements } = await import("@/lib/achievements/service");
          await checkAndAwardAchievements(user.userId, {
            puzzleId: puzzle.id,
            attempts: attemptNumber,
            maxAttempts,
            timeTaken: timeSpentSeconds,
            hintsUsed,
            difficulty: getAchievementDifficultyCategory(difficultyLevel),
            isCorrect: true,
            score: pointsEarned,
          });
        } catch (achievementError) {
          console.error("[guess] achievement error:", achievementError);
        }
      }
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
      // Reveal solution only after the day is locked for this user
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
