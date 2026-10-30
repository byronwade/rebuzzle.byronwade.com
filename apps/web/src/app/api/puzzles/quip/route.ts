/**
 * POST /api/puzzles/quip
 *
 * Streams one short in-character line reacting to a guess.
 *
 * The model is never given the answer — only the guess, the puzzle type, and
 * the band the scorer already placed the guess in. It literally cannot leak the
 * solution because it was never told it. Everything scoring-related still comes
 * from /api/puzzles/guess; this endpoint is decoration on top of a decision
 * that has already been made.
 *
 * Failure is non-fatal by design: the client already rendered the deterministic
 * line from the guess response, and simply keeps it if this stream never
 * arrives.
 */

import { NextResponse } from "next/server";
import { streamAIText } from "@/ai/client";
import { db } from "@/db";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { isPublishedPastPuzzle } from "@/lib/game/archive-puzzles";
import { findFreeArchiveSample } from "@/lib/game/archive-sample";
import { getLocalPuzzleDate } from "@/lib/game/daily-lock";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";
import { hasPlusEntitlement } from "@/lib/storekit/plus-entitlement";
import { resolveRequestTimeZone } from "@/lib/timezone";

/** Mid-game tiers only while the day is still open. */
const MID_GAME_TIERS = ["close", "warm", "cold"] as const;
/** Final tiers allowed even after today's attempt is written. */
const FINAL_TIERS = ["correct", "out"] as const;
const ALL_TIERS = [...MID_GAME_TIERS, ...FINAL_TIERS] as const;

type QuipTier = (typeof ALL_TIERS)[number];

const TIER_BRIEF: Record<QuipTier, string> = {
  close: "They are one small step away. Say so without hinting at what to change.",
  warm: "Part of their thinking is on track. Acknowledge it, don't guide it.",
  cold: "They are nowhere near. Be funny about the distance, never about them.",
  correct: "They solved it. Celebrate briefly — never restate or hint at the answer.",
  out: "They are out of guesses. Empathize briefly — never reveal or hint at the answer.",
};

function isQuipTier(value: unknown): value is QuipTier {
  return typeof value === "string" && (ALL_TIERS as readonly string[]).includes(value);
}

function isFinalTier(tier: QuipTier): boolean {
  return (FINAL_TIERS as readonly string[]).includes(tier);
}

const SYSTEM = `You are Eve, the author of Rebuzzle's daily puzzle, reacting to a player's guess.

Voice: dry, quick, a little smug about your own puzzle. Playful at the guess, never at the player.

Hard rules:
- Reply with ONE sentence. Under 14 words. No emoji, no quotes, no preamble.
- NEVER state, spell, rhyme with, describe, or hint at the correct answer.
- NEVER tell them which words to add, drop, or change.
- Do not ask questions. Do not offer help.
- Keep it clean and appropriate for a general audience.`;

const NO_STORE = { "Cache-Control": "private, no-store" };

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

const quipRateLimit = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyGenerator: (request) => {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    return `rate-limit:quip:${ip}`;
  },
});

export async function POST(request: Request) {
  let mode: unknown = "daily";
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return json({ success: false, error: "Not authenticated" }, 401);
    }

    const limit = await quipRateLimit(request);
    if (limit && !limit.success) {
      return json({ success: false, error: "Slow down" }, 429);
    }

    const userLimiter = rateLimit({
      windowMs: 60 * 1000,
      maxRequests: 12,
      keyGenerator: () => getUserKey(`quip:${user.userId}`),
    });
    const userLimit = await userLimiter(request);
    if (userLimit && !userLimit.success) {
      return json({ success: false, error: "Slow down" }, 429);
    }

    const body = (await request.json()) as {
      puzzleId?: string;
      guess?: string;
      tier?: string;
      mode?: unknown;
    };

    const puzzleId = typeof body.puzzleId === "string" ? body.puzzleId.trim() : "";
    const guess = typeof body.guess === "string" ? body.guess.trim().slice(0, 200) : "";
    const tier = isQuipTier(body.tier) ? body.tier : null;
    mode = body.mode === undefined ? "daily" : body.mode;

    if (!(puzzleId && guess && tier) || (mode !== "daily" && mode !== "practice")) {
      return json(
        { success: false, error: "puzzleId, guess, valid reaction tier and mode are required" },
        400
      );
    }

    const requestTimeZone = await resolveRequestTimeZone();
    const timeZone = await resolveStableJourneyTimeZone(user.userId, requestTimeZone);
    const localDateKey = getLocalPuzzleDate(new Date(), timeZone);
    const hasPlus = mode === "practice" ? await hasPlusEntitlement(request) : false;
    const freeSample =
      mode === "practice" && !hasPlus ? await findFreeArchiveSample(localDateKey) : null;
    const isFreeSample = freeSample?.id === puzzleId;
    if (mode === "practice" && !isFreeSample && !hasPlus) {
      return json(
        { success: false, error: "Rebuzzle Plus is required for archive practice." },
        403
      );
    }
    if (mode === "daily") {
      // Day already locked — only the closing win/loss riff may still spend credits.
      const lock = await db.puzzleAttemptOps.hasTodayAttempt(user.userId, localDateKey);
      if (lock.hasAttempt && !isFinalTier(tier)) {
        return json({ success: false, error: "Puzzle already finished for today" }, 409);
      }
    }

    // Only the type is read from the puzzle. The answer stays in the database.
    const puzzle = isFreeSample ? freeSample : await db.puzzleOps.findById(puzzleId);
    if (!puzzle) {
      return json({ success: false, error: "Puzzle not found" }, 404);
    }
    if (mode === "practice" && !isPublishedPastPuzzle(puzzle, localDateKey)) {
      return json({ success: false, error: "Puzzle not found" }, 404);
    }

    const result = await streamAIText({
      system: mode === "practice" ? SYSTEM.replace("daily puzzle", "puzzle") : SYSTEM,
      prompt: [
        `Puzzle type: ${puzzle.puzzleType || "rebus"}.`,
        `Their guess: "${guess}".`,
        `How it scored: ${tier}. ${TIER_BRIEF[tier]}`,
        "Write your one-sentence reaction.",
      ].join("\n"),
      modelType: "fast",
      temperature: 0.9,
      maxTokens: 48,
    });

    const response = result.toTextStreamResponse();
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", NO_STORE["Cache-Control"]);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error("[quip] Error:", error);
    // The client keeps its deterministic line — nothing to recover here.
    return json({ success: false, error: "Quip unavailable" }, 503);
  }
}
