import { NextResponse } from "next/server";
import { getNextUtcMidnight } from "@/lib/game/daily-lock";
import { toPublicPuzzle } from "@/lib/game/public-puzzle";
import { getTodaysPuzzle } from "../../../actions/puzzleGenerationActions";

/**
 * GET /api/puzzle/today
 *
 * Public daily puzzle for clients. Never includes the answer.
 * Scoring goes through POST /api/puzzles/guess.
 */
export async function GET() {
  try {
    const result = await getTodaysPuzzle();
    const now = new Date();
    const nextPuzzleTime = getNextUtcMidnight(now).toISOString();

    if (result.success && result.puzzle) {
      const raw = result.puzzle as Record<string, unknown>;
      return NextResponse.json({
        success: true,
        puzzle: toPublicPuzzle({
          id: raw.id,
          puzzle: raw.puzzle ?? raw.rebusPuzzle,
          rebusPuzzle: raw.rebusPuzzle,
          puzzleType: raw.puzzleType ?? "rebus",
          difficulty: raw.difficulty,
          hints: raw.hints ?? [],
          date: raw.date,
          category: raw.category,
          topic: raw.topic,
          relevanceScore: raw.relevanceScore,
          aiGenerated: raw.aiGenerated ?? false,
        }),
        cached: result.cached,
        generatedAt: result.generatedAt,
        serverTime: now.toISOString(),
        nextPuzzleTime,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate puzzle",
        serverTime: now.toISOString(),
        nextPuzzleTime,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error in puzzle API:", error);
    const now = new Date();
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        serverTime: now.toISOString(),
        nextPuzzleTime: getNextUtcMidnight(now).toISOString(),
      },
      { status: 500 }
    );
  }
}
