import { gameSettings } from "@rebuzzle/config";
import { after, NextResponse } from "next/server";
import { validateAnswer } from "@/ai/services/answer-validation";
import { db } from "@/db";
import { updateUserStats } from "@/lib/auth";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getAchievementDifficultyCategory } from "@/lib/difficulty";
import { buildWordResults } from "@/lib/game/build-word-results";
import {
  ARCHIVE_POINTS_MULTIPLIER,
  clampHints,
  clampTimeSpent,
  getArchiveLockKey,
  getUtcPuzzleDate,
} from "@/lib/game/daily-lock";
import { buildGuessReaction } from "@/lib/game/reactions";
import { composePointsMultiplier, rollEngagementMultipliers } from "@/lib/game/retention-stats";
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
 * Authoritative guess handler for:
 * - Today's daily puzzle (full points, streak-affecting)
 * - Past/archive puzzles (half points, does not affect streak)
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
        /** Prior consecutive cold misses this session (for sharper Eve lines). */
        consecutiveCold?: number;
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

    const todayKey = getUtcPuzzleDate();

    const [puzzle, todays] = await Promise.all([
      db.puzzleOps.findById(puzzleId),
      db.puzzleOps.findTodaysPuzzle(),
    ]);

    if (!puzzle?.answer) {
      return NextResponse.json({ success: false, error: "Puzzle not found" }, { status: 404 });
    }

    const isDaily = Boolean(todays && todays.id === puzzle.id);
    const publishedKey = puzzle.publishedAt ? getUtcPuzzleDate(new Date(puzzle.publishedAt)) : null;

    // Archive: any published puzzle that is not today's daily
    if (!isDaily) {
      if (!publishedKey || publishedKey >= todayKey) {
        return NextResponse.json(
          { success: false, error: "This puzzle is not playable yet" },
          { status: 403 }
        );
      }
    }

    const isArchive = !isDaily;
    const lockKey = isArchive ? getArchiveLockKey(puzzle.id) : todayKey;
    const basePointsMultiplier = isArchive ? ARCHIVE_POINTS_MULTIPLIER : 1;
    // Engagement rolls are server-authoritative (lucky + shared daily bonus day).
    const engagement = rollEngagementMultipliers();
    let pointsMultiplier = basePointsMultiplier;
    let isLucky = false;
    let hasDailyBonus = false;
    let dailyBonusMultiplier = 1;

    const context = await db.puzzleAttemptOps.getTodayGuessContext(user.userId, lockKey);
    const maxAttempts = gameSettings.maxAttempts;

    if (context.hasFinal) {
      return NextResponse.json(
        {
          success: false,
          error: isArchive ? "Already completed this archive puzzle" : "Already played today",
          locked: true,
          wasSuccessful: context.wasSuccessful,
          attemptsLeft: 0,
          gameOver: true,
          isArchive,
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
          isArchive,
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
      timeSpentSeconds = clampTimeSpent((nowMs - context.firstGuessAt.getTime()) / 1000);
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
      new Date(`${todayKey}T00:00:00.000Z`),
      {
        id: crypto.randomUUID(),
        userId: user.userId,
        puzzleId: puzzle.id,
        attemptedAnswer: guess,
        isCorrect,
        abandoned,
        isFinal,
        puzzleDate: lockKey,
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
          error: isArchive ? "Already completed this archive puzzle" : "Already played today",
          locked: true,
          wasSuccessful: write.attempt.isCorrect,
          attemptsLeft: 0,
          gameOver: true,
          isArchive,
        },
        { status: 409 }
      );
    }

    let pointsEarned = 0;
    let streakFrozen = false;
    let streakFreezesLeft = 0;
    let guessDistribution: number[] | undefined;
    let recentPlayDates: string[] | undefined;
    let maxStreak = 0;
    let currentStreak = 0;

    // Award wins before responding so the client can whisper the unlock in-thread.
    let unlockedAchievement: { name: string } | undefined;
    let unlockedForEmail: Awaited<
      ReturnType<typeof import("@/lib/achievements/service")["checkAndAwardAchievements"]>
    >["newlyUnlocked"] = [];

    if (isFinal && isCorrect) {
      isLucky = !isArchive && engagement.isLucky;
      hasDailyBonus = !isArchive && engagement.hasDailyBonus;
      dailyBonusMultiplier = hasDailyBonus ? engagement.dailyBonusMultiplier : 1;
      pointsMultiplier = composePointsMultiplier(basePointsMultiplier, engagement, true);
      // Archive keeps half-points only — no lucky/daily stacking.
      if (isArchive) {
        pointsMultiplier = basePointsMultiplier;
        isLucky = false;
        hasDailyBonus = false;
        dailyBonusMultiplier = 1;
      }

      try {
        const update = await updateUserStats(user.userId, {
          won: true,
          attempts: attemptNumber,
          timeSpent: timeSpentSeconds,
          difficulty: difficultyLevel,
          maxAttempts,
          hintsUsed,
          pointsMultiplier,
          affectsStreak: !isArchive,
          isLucky,
          hasDailyBonus,
          dailyBonusMultiplier,
        });
        pointsEarned = update.pointsEarned;
        currentStreak = update.streak;
        maxStreak = update.maxStreak;
        streakFreezesLeft = update.streakFreezes;
        guessDistribution = update.guessDistribution;
        recentPlayDates = update.recentPlayDates;

        const score = pointsEarned;
        const { checkAndAwardAchievements } = await import("@/lib/achievements/service");
        const { newlyUnlocked } = await checkAndAwardAchievements(user.userId, {
          puzzleId: puzzle.id,
          attempts: attemptNumber,
          maxAttempts,
          timeTaken: timeSpentSeconds,
          hintsUsed,
          difficulty: getAchievementDifficultyCategory(difficultyLevel),
          isCorrect: true,
          score,
        });
        unlockedForEmail = newlyUnlocked;
        if (newlyUnlocked[0]?.name) {
          unlockedAchievement = { name: newlyUnlocked[0].name };
        }

        // Achievements stay in-thread / email — no inbox spam on every unlock.
      } catch (error) {
        console.error("[guess] sync win update failed:", error);
        pointsEarned = Math.floor(
          calculateGamePoints(attemptNumber, timeSpentSeconds, 1, difficultyLevel) *
            pointsMultiplier
        );
      }
    }

    // Apply loss stats synchronously so streak-freeze feedback reaches the client.
    if (isFinal && !isCorrect) {
      try {
        const lossUpdate = await updateUserStats(user.userId, {
          won: false,
          attempts: attemptNumber,
          timeSpent: timeSpentSeconds,
          difficulty: difficultyLevel,
          maxAttempts,
          hintsUsed,
          pointsMultiplier: basePointsMultiplier,
          affectsStreak: !isArchive,
        });
        streakFrozen = lossUpdate.streakFrozen;
        streakFreezesLeft = lossUpdate.streakFreezes;
        currentStreak = lossUpdate.streak;
        maxStreak = lossUpdate.maxStreak;
        guessDistribution = lossUpdate.guessDistribution;
        recentPlayDates = lossUpdate.recentPlayDates;
        // Freeze feedback stays on the result card — quiet, not an inbox alert.
      } catch (error) {
        console.error("[guess] sync loss update failed:", error);
      }
    }

    if (isFinal) {
      const uid = user.userId;
      const pid = puzzle.id;
      const emailUnlocks = unlockedForEmail;
      after(async () => {
        try {
          const { recordFinalAttemptSignal } = await import("@/ai/learning");
          await recordFinalAttemptSignal({
            puzzleId: pid,
            userId: uid,
            isCorrect,
            timeSpentSeconds,
            attemptNumber,
            hintsUsed,
            isArchive,
          });

          if (isCorrect && emailUnlocks.length > 0) {
            const dbUser = await db.userOps.findById(uid);
            if (dbUser && !dbUser.isGuest && dbUser.email) {
              const { getUserAchievementProgress } = await import("@/lib/achievements/service");
              const { sendAchievementUnlockedEmail } = await import(
                "@/lib/notifications/email-service"
              );
              const progress = await getUserAchievementProgress(uid);
              for (const achievement of emailUnlocks.slice(0, 3)) {
                await sendAchievementUnlockedEmail(dbUser.email, {
                  username: dbUser.username,
                  achievementName: achievement.name,
                  achievementDescription: achievement.description,
                  achievementRarity: achievement.rarity,
                  achievementPoints: achievement.points,
                  achievementIcon: achievement.icon,
                  totalUnlocked: progress.unlocked,
                  totalAchievements: progress.total,
                });
              }
            }
          }
        } catch (error) {
          console.error("[guess] post-response update failed:", error);
        }
      });
    }

    const similarity = Math.round((validation.confidence ?? 0) * 100);
    const consecutiveCold =
      typeof body.consecutiveCold === "number" && body.consecutiveCold > 0
        ? Math.min(Math.floor(body.consecutiveCold), 10)
        : 0;

    return NextResponse.json({
      success: true,
      correct: isCorrect,
      similarity,
      // Eve's instant read on the guess. Derived from the similarity score, so
      // the client learns "how close" without ever receiving the answer.
      reaction: buildGuessReaction({
        correct: isCorrect,
        similarity,
        attemptsLeft,
        guess,
        consecutiveCold,
      }),
      method: validation.method,
      attemptNumber,
      attemptsLeft,
      maxAttempts,
      gameOver: isFinal,
      locked: isFinal,
      wordResults,
      isArchive,
      pointsMultiplier,
      ...(isFinal
        ? {
            answer: puzzle.answer,
            explanation: puzzle.explanation || "",
            pointsEarned,
            wasSuccessful: isCorrect,
            isLucky,
            hasDailyBonus,
            dailyBonusMultiplier: hasDailyBonus ? dailyBonusMultiplier : 1,
            streak: currentStreak,
            maxStreak,
            streakFreezes: streakFreezesLeft,
            streakFrozen,
            guessDistribution,
            recentPlayDates,
            ...(unlockedAchievement ? { unlockedAchievement } : {}),
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
