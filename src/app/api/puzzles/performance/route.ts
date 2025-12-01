/**
 * Puzzle Performance Analytics API
 *
 * Provides performance metrics and insights for puzzles
 */

import { NextResponse } from "next/server";
import {
  analyzePuzzlePerformance,
  calculateActualDifficulty,
  generateImprovementSuggestions,
} from "@/ai/services/puzzle-learning";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const puzzleId = searchParams.get("puzzleId");
    const includeSuggestions =
      searchParams.get("includeSuggestions") === "true";

    if (!puzzleId) {
      return NextResponse.json(
        { error: "puzzleId is required" },
        { status: 400 }
      );
    }

    const performance = await analyzePuzzlePerformance(puzzleId);
    const actualDifficulty = await calculateActualDifficulty(puzzleId);

    const response: Record<string, unknown> = {
      success: true,
      performance: {
        ...performance,
        actualDifficulty,
      },
    };

    if (includeSuggestions) {
      const suggestions = await generateImprovementSuggestions(puzzleId);
      response.suggestions = suggestions;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Puzzle Performance API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to analyze puzzle performance",
      },
      { status: 500 }
    );
  }
}

