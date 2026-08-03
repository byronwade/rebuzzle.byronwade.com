import { NextResponse } from "next/server";
import { getLocalPuzzleDate, getNextLocalMidnight } from "@/lib/game/daily-lock";
import { toPublicPuzzle } from "@/lib/game/public-puzzle";
import { buildCacheControl } from "@/lib/http/cache-headers";
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
export async function GET() {
  try {
    const now = new Date();
    const timeZone = await resolveRequestTimeZone();
    const localDateKey = getLocalPuzzleDate(now, timeZone);
    const nextPuzzleTime = getNextLocalMidnight(now, timeZone).toISOString();

    const result = await getTodaysPuzzle(undefined, localDateKey, { allowAiGenerate: false });

    if (result.success && result.puzzle) {
      const raw = result.puzzle as Record<string, unknown>;
      return NextResponse.json(
        {
          success: true,
          puzzle: toPublicPuzzle({
            id: raw.id,
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
