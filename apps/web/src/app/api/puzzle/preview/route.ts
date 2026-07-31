import { NextResponse } from "next/server";
import { previewPuzzleGeneration } from "../../../actions/puzzleGenerationActions";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * Admin-only AI generation smoke test. Returns generated content to admins only.
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const result = await previewPuzzleGeneration();

    if (result.success) {
      return NextResponse.json({
        success: true,
        puzzle: result.puzzle,
        metadata: result.metadata,
        message: result.message,
        provider: result.provider,
      });
    }
    return NextResponse.json(
      {
        success: false,
        error: result.error || "Failed to preview puzzle",
        fallback: result.fallback,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error in puzzle preview API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
