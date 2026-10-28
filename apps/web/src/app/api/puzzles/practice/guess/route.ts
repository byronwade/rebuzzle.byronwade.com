import { NextResponse } from "next/server";
import { validateAnswer } from "@/ai/services/answer-validation";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { isPublishedPastPuzzle } from "@/lib/game/archive-puzzles";
import { findFreeArchiveSample } from "@/lib/game/archive-sample";
import { buildWordResults } from "@/lib/game/build-word-results";
import { getLocalPuzzleDate } from "@/lib/game/daily-lock";
import {
  createPracticeRoundToken,
  verifyPracticeRoundToken,
} from "@/lib/game/practice-round-token";
import { buildGuessReaction } from "@/lib/game/reactions";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";
import { hasPlusEntitlement } from "@/lib/storekit/plus-entitlement";
import { resolveRequestTimeZone } from "@/lib/timezone";

const MAX_ATTEMPTS = 3;
const NO_STORE = { "Cache-Control": "private, no-store" };
const puzzleIdPattern = /^[A-Za-z0-9_-]{1,128}$/;

const practiceIpRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyGenerator: (request) => {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    return `rate-limit:practice-guess:${ip}`;
  },
});

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

/** Ephemeral, unscored guess feedback for a published puzzle from a prior day. */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return json({ success: false, error: "Not authenticated" }, 401);

    const [ipLimit, userLimit] = await Promise.all([
      practiceIpRateLimit(request),
      rateLimit({
        windowMs: 60 * 1000,
        maxRequests: 12,
        keyGenerator: () => getUserKey(`practice-guess:${user.userId}`),
      })(request),
    ]);
    const rejectedLimit = [ipLimit, userLimit].find((limit) => limit && !limit.success);
    if (rejectedLimit) {
      return json(
        { success: false, error: "Too many guesses. Slow down." },
        429,
        rejectedLimit === ipLimit
          ? {
              "Retry-After": String(ipLimit?.retryAfter ?? 60),
              "X-RateLimit-Limit": String(ipLimit?.limit ?? 20),
              "X-RateLimit-Remaining": String(ipLimit?.remaining ?? 0),
            }
          : {}
      );
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ success: false, error: "Invalid request body" }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ success: false, error: "Invalid request body" }, 400);
    }

    const input = body as Record<string, unknown>;
    const puzzleId = typeof input.puzzleId === "string" ? input.puzzleId.trim() : "";
    const guess = typeof input.guess === "string" ? input.guess.trim() : "";
    const attemptNumber = input.attemptNumber;
    if (!puzzleIdPattern.test(puzzleId)) {
      return json({ success: false, error: "Invalid puzzle ID" }, 400);
    }
    if (!guess || guess.length > 200) {
      return json(
        { success: false, error: guess ? "Guess is too long" : "A guess is required" },
        400
      );
    }
    if (
      typeof attemptNumber !== "number" ||
      !Number.isInteger(attemptNumber) ||
      attemptNumber < 1 ||
      attemptNumber > MAX_ATTEMPTS
    ) {
      return json({ success: false, error: "Invalid attempt number" }, 400);
    }

    const submittedRoundToken = input.roundToken;
    const previousRoundClaims =
      submittedRoundToken === undefined
        ? null
        : await verifyPracticeRoundToken(submittedRoundToken, user.userId, puzzleId);
    if (
      submittedRoundToken !== undefined &&
      (typeof submittedRoundToken !== "string" ||
        !previousRoundClaims ||
        attemptNumber !== previousRoundClaims.wrongGuessCount + 1 ||
        !(await db.practiceRoundOps.isTokenActive({
          userId: user.userId,
          puzzleId,
          roundId: previousRoundClaims.roundId,
          token: submittedRoundToken,
          expiresAt: previousRoundClaims.expiresAt,
        })))
    ) {
      return json(
        { success: false, error: "This practice round has expired or no longer matches." },
        409
      );
    }
    if (submittedRoundToken === undefined && attemptNumber !== 1) {
      return json(
        { success: false, error: "This practice round has expired or no longer matches." },
        409
      );
    }

    const requestTimeZone = await resolveRequestTimeZone();
    const timeZone = await resolveStableJourneyTimeZone(user.userId, requestTimeZone);
    const localDateKey = getLocalPuzzleDate(new Date(), timeZone);
    const hasPlus = await hasPlusEntitlement(request);
    const freeSample = hasPlus ? null : await findFreeArchiveSample(localDateKey);
    const isFreeSample = freeSample?.id === puzzleId;
    if (!isFreeSample && !hasPlus) {
      return json(
        { success: false, error: "Rebuzzle Plus is required for archive practice." },
        403
      );
    }
    const puzzle = isFreeSample ? freeSample : await db.puzzleOps.findById(puzzleId);
    if (!puzzle?.answer || !isPublishedPastPuzzle(puzzle, localDateKey)) {
      return json({ success: false, error: "Puzzle not found" }, 404);
    }

    const validation = await validateAnswer({ guess, correctAnswer: puzzle.answer });
    const correct = validation.isCorrect;
    const attemptsLeft = correct ? 0 : Math.max(0, MAX_ATTEMPTS - attemptNumber);
    const gameOver = correct || attemptsLeft === 0;
    const similarity = Math.round((validation.confidence ?? 0) * 100);
    const reaction = buildGuessReaction({
      correct,
      similarity,
      attemptsLeft,
      guess,
    });
    const nextRoundToken = !correct
      ? await createPracticeRoundToken({
          userId: user.userId,
          puzzleId,
          wrongGuessCount: attemptNumber,
          ...(previousRoundClaims ? { roundId: previousRoundClaims.roundId } : {}),
        })
      : null;
    const nextRoundClaims = nextRoundToken
      ? await verifyPracticeRoundToken(nextRoundToken, user.userId, puzzleId)
      : null;
    if (nextRoundToken && !nextRoundClaims) {
      throw new Error("New practice round token did not verify");
    }

    if (previousRoundClaims && typeof submittedRoundToken === "string") {
      const advanced = await db.practiceRoundOps.advanceToken(
        {
          userId: user.userId,
          puzzleId,
          roundId: previousRoundClaims.roundId,
          token: submittedRoundToken,
          expiresAt: previousRoundClaims.expiresAt,
        },
        nextRoundToken && nextRoundClaims
          ? {
              userId: user.userId,
              puzzleId,
              roundId: nextRoundClaims.roundId,
              token: nextRoundToken,
              expiresAt: nextRoundClaims.expiresAt,
            }
          : null
      );
      if (!advanced) {
        return json(
          { success: false, error: "This practice round has expired or no longer matches." },
          409
        );
      }
    } else if (nextRoundToken && nextRoundClaims) {
      await db.practiceRoundOps.activateToken({
        userId: user.userId,
        puzzleId,
        roundId: nextRoundClaims.roundId,
        token: nextRoundToken,
        expiresAt: nextRoundClaims.expiresAt,
      });
    }

    return json({
      success: true,
      correct,
      similarity,
      reaction:
        !correct && gameOver
          ? { ...reaction, line: "That round is over. Reveal the solution whenever you're ready." }
          : reaction,
      method: validation.method,
      attemptNumber,
      attemptsLeft,
      maxAttempts: MAX_ATTEMPTS,
      gameOver,
      locked: gameOver,
      wordResults: buildWordResults(guess, puzzle.answer),
      isArchive: true,
      isPractice: true,
      unscored: true,
      ...(nextRoundToken ? { roundToken: nextRoundToken } : {}),
      ...(correct ? { answer: puzzle.answer, explanation: puzzle.explanation ?? "" } : {}),
    });
  } catch (error) {
    console.error("Error processing practice guess:", error);
    return json({ success: false, error: "Unable to check this guess" }, 500);
  }
}
