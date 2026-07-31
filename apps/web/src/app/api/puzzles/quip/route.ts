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
import type { ReactionTier } from "@/lib/game/reactions";
import { getUserKey, rateLimit } from "@/lib/middleware/rate-limit";

const TIERS: ReactionTier[] = ["correct", "close", "warm", "cold", "out"];

const TIER_BRIEF: Record<ReactionTier, string> = {
  correct: "They just solved it. Congratulate them briefly and get out of the way.",
  close: "They are one small step away. Say so without hinting at what to change.",
  warm: "Part of their thinking is on track. Acknowledge it, don't guide it.",
  cold: "They are nowhere near. Be funny about the distance, never about them.",
  out: "They are out of attempts. Drop the teasing and land it warmly.",
};

const SYSTEM = `You are Eve, the author of Rebuzzle's daily puzzle, reacting to a player's guess.

Voice: dry, quick, a little smug about your own puzzle. Playful at the guess, never at the player.

Hard rules:
- Reply with ONE sentence. Under 14 words. No emoji, no quotes, no preamble.
- NEVER state, spell, rhyme with, describe, or hint at the correct answer.
- NEVER tell them which words to add, drop, or change.
- Do not ask questions. Do not offer help.
- Keep it clean and appropriate for a general audience.`;

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
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const limit = await quipRateLimit(request);
    if (limit && !limit.success) {
      return NextResponse.json({ success: false, error: "Slow down" }, { status: 429 });
    }

    const userLimiter = rateLimit({
      windowMs: 60 * 1000,
      maxRequests: 12,
      keyGenerator: () => getUserKey(`quip:${user.userId}`),
    });
    const userLimit = await userLimiter(request);
    if (userLimit && !userLimit.success) {
      return NextResponse.json({ success: false, error: "Slow down" }, { status: 429 });
    }

    const body = (await request.json()) as {
      puzzleId?: string;
      guess?: string;
      tier?: string;
    };

    const puzzleId = typeof body.puzzleId === "string" ? body.puzzleId.trim() : "";
    const guess = typeof body.guess === "string" ? body.guess.trim().slice(0, 200) : "";
    const tier = TIERS.includes(body.tier as ReactionTier) ? (body.tier as ReactionTier) : null;

    if (!(puzzleId && guess && tier)) {
      return NextResponse.json(
        { success: false, error: "puzzleId, guess and tier are required" },
        { status: 400 }
      );
    }

    // Only the type is read from the puzzle. The answer stays in the database.
    const puzzle = await db.puzzleOps.findById(puzzleId);
    if (!puzzle) {
      return NextResponse.json({ success: false, error: "Puzzle not found" }, { status: 404 });
    }

    const result = await streamAIText({
      system: SYSTEM,
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

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("[quip] Error:", error);
    // The client keeps its deterministic line — nothing to recover here.
    return NextResponse.json({ success: false, error: "Quip unavailable" }, { status: 503 });
  }
}
