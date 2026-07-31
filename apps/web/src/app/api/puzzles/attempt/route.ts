import { NextResponse } from "next/server";

/**
 * POST /api/puzzles/attempt
 *
 * Deprecated. Daily puzzle completion is handled exclusively by
 * POST /api/puzzles/guess which validates answers server-side and
 * enforces the one-play-per-day lock.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Deprecated. Submit guesses to /api/puzzles/guess",
    },
    { status: 410 }
  );
}
