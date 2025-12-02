import { NextResponse } from "next/server";
import { hasPuzzleType, listPuzzleTypes } from "@/ai/config/puzzle-types";
import { regenerateTodaysPuzzle } from "@/app/actions/regeneratePuzzleActions";

/**
 * API endpoint to regenerate today's puzzle
 *
 * This deletes the old puzzle and generates a new one using the new system
 *
 * Usage:
 * - GET /api/puzzle/regenerate - Regenerate with default puzzle type
 * - GET /api/puzzle/regenerate?type=rebus - Regenerate with specific type
 * - GET /api/puzzle/regenerate?type=word-puzzle - Generate word puzzle
 * - GET /api/puzzle/regenerate?list=true - List available puzzle types
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const listTypes = searchParams.get("list") === "true";
    const puzzleType = searchParams.get("type");

    // List available puzzle types
    if (listTypes) {
      const types = listPuzzleTypes();
      return NextResponse.json({
        success: true,
        availableTypes: types,
        defaultType: process.env.DEFAULT_PUZZLE_TYPE || "rebus",
      });
    }

    // Validate puzzle type if provided
    if (puzzleType && !hasPuzzleType(puzzleType)) {
      const availableTypes = listPuzzleTypes();
      return NextResponse.json(
        {
          success: false,
          error: `Invalid puzzle type: "${puzzleType}"`,
          availableTypes,
        },
        { status: 400 }
      );
    }

    const result = await regenerateTodaysPuzzle(puzzleType || undefined);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      puzzle: result.puzzle,
    });
  } catch (error) {
    console.error("Error regenerating puzzle:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
