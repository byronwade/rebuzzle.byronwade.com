import { NextResponse } from "next/server";
import { hasPuzzleType, listPuzzleTypes } from "@/ai/config/puzzle-types";
import { regenerateTodaysPuzzle } from "@/app/actions/regeneratePuzzleActions";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { toPublicPuzzle } from "@/lib/game/public-puzzle";

/**
 * Admin-only: regenerate today's puzzle.
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const listTypes = searchParams.get("list") === "true";
    const puzzleType = searchParams.get("type");

    if (listTypes) {
      return NextResponse.json({
        success: true,
        availableTypes: listPuzzleTypes(),
        defaultType: process.env.DEFAULT_PUZZLE_TYPE || "rebus",
      });
    }

    if (puzzleType && !hasPuzzleType(puzzleType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid puzzle type: "${puzzleType}"`,
          availableTypes: listPuzzleTypes(),
        },
        { status: 400 }
      );
    }

    const result = await regenerateTodaysPuzzle(puzzleType || undefined);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      // Never ship the answer even to admin list UIs via this route's default —
      // admin tools that need it should use the admin puzzles API.
      puzzle: result.puzzle ? toPublicPuzzle(result.puzzle as Record<string, unknown>) : undefined,
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
