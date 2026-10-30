import { db } from "@/db";
import { nativeGrowthEventOps } from "@/db/analytics-ops";
import type { PuzzleAttempt } from "@/db/models";
import { updateUserStats } from "@/lib/auth";
import { gameSettings } from "@/lib/gameSettings";

export type ExtendedDailyFinalizationReason = "revealed" | "expired";

export async function finalizeExtendedDailyRun(input: {
  userId: string;
  puzzleId: string;
  puzzleDate: string;
  timeZone: string;
  difficultyLevel: number;
  reason: ExtendedDailyFinalizationReason;
  attempts: PuzzleAttempt[];
}): Promise<PuzzleAttempt | null> {
  const attempts = input.attempts
    .filter((attempt) => attempt.attemptType !== "finalization")
    .sort((a, b) => (a.attemptNumber ?? 0) - (b.attemptNumber ?? 0));
  const existingFinal = input.attempts.find((attempt) => attempt.isFinal === true);

  const maxAttempts = attempts.at(-1)?.maxAttempts ?? gameSettings.maxAttempts;
  const mode = attempts.some((attempt) => attempt.playMode === "extended");
  const lastGuess = attempts.at(-1);
  if (existingFinal) {
    if (
      existingFinal.attemptType === "finalization" &&
      existingFinal.isCorrect !== true &&
      mode &&
      attempts.length >= maxAttempts &&
      lastGuess
    ) {
      await applyLossStats(input, attempts, lastGuess, maxAttempts);
    }
    return existingFinal;
  }
  if (!mode || attempts.length < maxAttempts || !lastGuess) return null;

  const now = new Date();
  const attemptNumber =
    Math.max(
      attempts.length,
      ...attempts.map((attempt, index) => attempt.attemptNumber ?? index + 1)
    ) + 1;
  const finalAttempt: PuzzleAttempt = {
    id: crypto.randomUUID(),
    userId: input.userId,
    puzzleId: input.puzzleId,
    attemptedAnswer: "",
    isCorrect: false,
    attemptedAt: now,
    puzzleDate: input.puzzleDate,
    puzzleTimeZone: lastGuess.puzzleTimeZone ?? input.timeZone,
    isFinal: true,
    abandoned: true,
    playMode: "extended",
    attemptType: "finalization",
    isScoredAttempt: false,
    finalizationReason: input.reason,
    attemptNumber,
    maxAttempts,
    timeSpentSeconds: lastGuess.timeSpentSeconds ?? 0,
    hintsUsed: Math.max(0, ...attempts.map((attempt) => attempt.hintsUsed ?? 0)),
    difficulty: lastGuess.difficulty,
    difficultyLevel: input.difficultyLevel,
  };

  const write = await db.puzzleAttemptOps.createAtomicDailyAttempt(
    input.userId,
    new Date(`${input.puzzleDate}T00:00:00.000Z`),
    finalAttempt
  );
  if (!write.success) {
    if (write.attempt?.attemptType === "finalization" && write.attempt.isCorrect !== true) {
      await applyLossStats(input, attempts, lastGuess, maxAttempts);
    }
    return write.attempt;
  }

  try {
    await db.dailyProgressOps.materializeFromAttempt(write.attempt);
  } catch (error) {
    console.error("[extended daily] Journey projection write failed:", error);
    try {
      await db.dailyProgressBackfillOps.requestReconciliation(input.userId);
    } catch (markerError) {
      console.error("[extended daily] Journey reconciliation marker failed:", markerError);
    }
  }

  await applyLossStats(input, attempts, lastGuess, maxAttempts, finalAttempt.hintsUsed);

  try {
    await nativeGrowthEventOps.recordOnce({
      userId: input.userId,
      eventType: "daily_finished",
      dayKey: input.puzzleDate,
      occurredAt: now,
      outcome: "ran_out",
    });
  } catch (error) {
    console.error("[extended daily] Daily completion event write failed:", error);
  }

  return write.attempt;
}

async function applyLossStats(
  input: {
    userId: string;
    puzzleId: string;
    puzzleDate: string;
    timeZone: string;
    difficultyLevel: number;
  },
  attempts: PuzzleAttempt[],
  lastGuess: PuzzleAttempt,
  maxAttempts: number,
  hintsUsed = Math.max(0, ...attempts.map((attempt) => attempt.hintsUsed ?? 0))
): Promise<void> {
  try {
    const result = await updateUserStats(
      input.userId,
      {
        won: false,
        attempts: attempts.length,
        timeSpent: lastGuess.timeSpentSeconds ?? 0,
        difficulty: input.difficultyLevel,
        maxAttempts,
        hintsUsed,
        pointsMultiplier: 0,
        affectsStreak: true,
        timeZone: lastGuess.puzzleTimeZone ?? input.timeZone,
      },
      new Date(lastGuess.attemptedAt),
      `extended-daily-finalization:${input.puzzleId}:${input.puzzleDate}`
    );
    if (!result.ok) {
      console.error("[extended daily] Loss stats update was not applied");
      return;
    }
  } catch (error) {
    console.error("[extended daily] Loss stats update failed:", error);
    return;
  }

  // Stats are applied (or were already applied under this idempotency key):
  // stop expiry recovery from replaying this run on every session restore.
  try {
    await db.puzzleAttemptOps.markExtendedDailyRunAccounted(
      input.userId,
      input.puzzleId,
      input.puzzleDate
    );
  } catch (error) {
    console.error("[extended daily] Accounting marker write failed:", error);
  }
}
