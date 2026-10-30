import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-middleware";
import { getLocalPuzzleDate, getNextLocalMidnight } from "@/lib/game/daily-lock";
import { toPublicPuzzle } from "@/lib/game/public-puzzle";
import { toPublicVisual } from "@/lib/game/public-visual";
import { buildCacheControl } from "@/lib/http/cache-headers";
import { resolveStableJourneyTimeZone } from "@/lib/journey-timezone";
import { resolveRequestTimeZone } from "@/lib/timezone";
import { getTodaysPuzzle } from "../../../actions/puzzleGenerationActions";

/**
 * GET /api/puzzle/today
 *
 * Public daily puzzle for the caller's local calendar day.
 * Never includes the answer. Scoring goes through POST /api/puzzles/guess.
 *
 * Generation still stores one puzzle per YYYY-MM-DD; this route only chooses
 * which date key is "today" for the request timezone.
 */
export async function GET(request?: Request) {
  try {
    const now = new Date();
    const [requestTimeZone, user] = await Promise.all([
      resolveRequestTimeZone(),
      request ? getAuthenticatedUser(request) : Promise.resolve(null),
    ]);
    const timeZone = await resolveStableJourneyTimeZone(user?.userId ?? null, requestTimeZone);
    const localDateKey = getLocalPuzzleDate(now, timeZone);
    const nextPuzzleTime = getNextLocalMidnight(now, timeZone).toISOString();

    const result = await getTodaysPuzzle(undefined, localDateKey, { allowAiGenerate: false });

    if (result.success && result.puzzle) {
      const raw = result.puzzle as Record<string, unknown>;
      const visual = raw.visual;
      if (
        visual &&
        typeof visual === "object" &&
        "canonicalBoard" in visual &&
        request?.headers.get("X-Rebuzzle-Canonical-Board") !== "1"
      ) {
        return NextResponse.json(
          {
            success: false,
            updateRequired: true,
            error: "Update Rebuzzle to the latest version in TestFlight to play this puzzle.",
          },
          { status: 426, headers: { "Cache-Control": "private, no-store" } }
        );
      }
      return NextResponse.json(
        {
          success: true,
          puzzle: toPublicPuzzle({
            id: raw.id,
            visual: toPublicVisual(raw.visual),
            puzzle: raw.puzzle ?? raw.rebusPuzzle,
            rebusPuzzle: raw.rebusPuzzle,
            puzzleType: raw.puzzleType ?? "rebus",
            difficulty: raw.difficulty,
            hints: raw.hints ?? [],
            date: raw.date ?? localDateKey,
            category: raw.category,
            topic: raw.topic,
            relevanceScore: raw.relevanceScore,
            aiGenerated: raw.aiGenerated ?? false,
          }),
          cached: result.cached,
          generatedAt: result.generatedAt,
          serverTime: now.toISOString(),
          puzzleDate: localDateKey,
          timeZone,
          nextPuzzleTime,
        },
        {
          headers: {
            // Private: nextPuzzleTime / date key are timezone-specific.
            "Cache-Control": buildCacheControl({ private: true }),
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load puzzle",
        serverTime: now.toISOString(),
        puzzleDate: localDateKey,
        timeZone,
        nextPuzzleTime,
      },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  } catch (error) {
    console.error("Error in puzzle API:", error);
    const now = new Date();
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        serverTime: now.toISOString(),
        nextPuzzleTime: getNextLocalMidnight(now).toISOString(),
      },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }
}
