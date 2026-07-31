/**
 * AI Suggestions Generation API — retired for client play.
 *
 * Autocomplete against the answer is an oracle. Daily play uses
 * precomputed hints and /api/puzzles/guess for scoring.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Deprecated. Use puzzle hints and /api/puzzles/guess",
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json({
    endpoint: {
      POST: {
        status: "gone",
        use: "puzzle.hints + POST /api/puzzles/guess",
      },
    },
  });
}
