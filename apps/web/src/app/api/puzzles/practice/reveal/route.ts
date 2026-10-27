import { NextResponse } from "next/server";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { isPublishedPastPuzzle } from "@/lib/game/archive-puzzles";
import { getLocalPuzzleDate } from "@/lib/game/daily-lock";
import { verifyPracticeRoundToken } from "@/lib/game/practice-round-token";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";
import { hasPlusEntitlement } from "@/lib/storekit/plus-entitlement";
import { resolveRequestTimeZone } from "@/lib/timezone";

const NO_STORE = { "Cache-Control": "private, no-store" };
const puzzleIdPattern = /^[A-Za-z0-9_-]{1,128}$/;

const practiceRevealIpRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyGenerator: (request) => {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    return `rate-limit:practice-reveal:${ip}`;
  },
});

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/** Explicit solution reveal for a published prior-day puzzle; this route is read-only. */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return json({ success: false, error: "Not authenticated" }, 401);

    const [ipLimit, userLimit] = await Promise.all([
      practiceRevealIpRateLimit(request),
      rateLimit({
        windowMs: 60 * 1000,
        maxRequests: 12,
        keyGenerator: () => getUserKey(`practice-reveal:${user.userId}`),
      })(request),
    ]);
    if ((ipLimit && !ipLimit.success) || (userLimit && !userLimit.success)) {
      return json({ success: false, error: "Too many reveals. Slow down." }, 429);
    }
    if (!(await hasPlusEntitlement(request))) {
      return json(
        { success: false, error: "Rebuzzle Plus is required for archive practice." },
        403
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
    const puzzleId = input.puzzleId;
    if (typeof puzzleId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(puzzleId.trim())) {
      return json({ success: false, error: "Invalid puzzle ID" }, 400);
    }
    const wrongGuessCount = await verifyPracticeRoundToken(
      input.roundToken,
      user.userId,
      puzzleId.trim()
    );
    if (wrongGuessCount !== 3) {
      return json(
        {
          success: false,
          error: "Finish the three-guess practice round before revealing its solution",
        },
        409
      );
    }

    const requestTimeZone = await resolveRequestTimeZone();
    const timeZone = await resolveStableJourneyTimeZone(user.userId, requestTimeZone);
    const localDateKey = getLocalPuzzleDate(new Date(), timeZone);
    const puzzle = await db.puzzleOps.findById(puzzleId.trim());
    if (!puzzle?.answer || !isPublishedPastPuzzle(puzzle, localDateKey)) {
      return json({ success: false, error: "Puzzle not found" }, 404);
    }

    return json({
      success: true,
      puzzleId: puzzle.id,
      answer: puzzle.answer,
      explanation: puzzle.explanation ?? "",
    });
  } catch (error) {
    console.error("Error revealing practice puzzle:", error);
    return json({ success: false, error: "Unable to reveal this solution" }, 500);
  }
}
