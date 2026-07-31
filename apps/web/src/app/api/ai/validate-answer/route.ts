/**
 * AI Answer Validation API — retired for client use.
 *
 * Gameplay scoring and daily lock live exclusively in POST /api/puzzles/guess.
 * Leaving this open (even with puzzleId) was an answer-oracle for probing.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Deprecated. Submit guesses to /api/puzzles/guess",
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json({
    endpoint: {
      POST: {
        status: "gone",
        use: "POST /api/puzzles/guess",
      },
    },
  });
}
