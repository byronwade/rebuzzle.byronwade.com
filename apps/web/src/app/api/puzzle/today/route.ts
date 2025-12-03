import { NextResponse } from "next/server";
import { getTodaysPuzzle } from "../../../actions/puzzleGenerationActions";

export async function GET() {
  try {
    const result = await getTodaysPuzzle();

    // Calculate next puzzle time (next midnight UTC)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    if (result.success) {
      return NextResponse.json({
        success: true,
        puzzle: result.puzzle,
        cached: result.cached,
        generatedAt: result.generatedAt,
        // Server time data for accurate countdown
        serverTime: now.toISOString(),
        nextPuzzleTime: tomorrow.toISOString(),
      });
    }
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate puzzle",
        serverTime: now.toISOString(),
        nextPuzzleTime: tomorrow.toISOString(),
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error in puzzle API:", error);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        serverTime: now.toISOString(),
        nextPuzzleTime: tomorrow.toISOString(),
      },
      { status: 500 }
    );
  }
}
