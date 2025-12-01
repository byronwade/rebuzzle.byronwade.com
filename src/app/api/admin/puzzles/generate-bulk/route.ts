import { NextResponse } from "next/server";
import { generateMasterPuzzle } from "@/ai/advanced";
import type { MasterGenerationParams } from "@/ai/services/master-puzzle-orchestrator";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * POST /api/admin/puzzles/generate-bulk
 * Generate multiple puzzles (preview mode - doesn't save to database)
 */
export async function POST(request: Request) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      count = 5,
      puzzleType = "rebus",
      difficultyMin = 5,
      difficultyMax = 10,
      category,
      theme,
    }: {
      count?: number;
      puzzleType?: string;
      difficultyMin?: number;
      difficultyMax?: number;
      category?: string;
      theme?: string;
    } = body;

    // Validate count (max 50 for performance)
    const validatedCount = Math.min(50, Math.max(1, count));
    const validatedMin = Math.max(5, Math.min(10, difficultyMin));
    const validatedMax = Math.max(5, Math.min(10, difficultyMax));

    console.log(`[Admin] Generating ${validatedCount} puzzles in bulk...`);

    const puzzles: any[] = [];
    const errors: string[] = [];

    // Generate puzzles sequentially to avoid overwhelming the AI
    for (let i = 0; i < validatedCount; i++) {
      try {
        // Vary difficulty across the range
        const difficulty =
          validatedMin === validatedMax
            ? validatedMin
            : Math.floor(
                validatedMin + Math.random() * (validatedMax - validatedMin)
              );

        const params: MasterGenerationParams = {
          targetDifficulty: difficulty,
          puzzleType,
          category,
          theme,
          maxAttempts: 2, // Fewer attempts for bulk generation
        };

        const result = await generateMasterPuzzle(params);

        if (result.status === "success") {
          const puzzleData = result.puzzle as any;
          puzzles.push({
            puzzle: puzzleData.rebusPuzzle || puzzleData.puzzle || "",
            puzzleType,
            answer: puzzleData.answer,
            difficulty: puzzleData.difficulty,
            category: puzzleData.category || category || "general",
            explanation: puzzleData.explanation,
            hints: puzzleData.hints || [],
            publishedAt: new Date().toISOString(),
            active: true,
            metadata: {
              qualityScore:
                result.metadata.qualityMetrics?.scores?.overall || 0,
              uniquenessScore: result.metadata.uniquenessScore || 0,
              difficultyProfile: result.metadata.difficultyProfile,
            },
          });
        } else {
          errors.push(`Puzzle ${i + 1}: ${result.recommendations.join(", ")}`);
        }
      } catch (error) {
        errors.push(
          `Puzzle ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      puzzles,
      metadata: {
        requested: validatedCount,
        generated: puzzles.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Admin bulk puzzle generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate puzzles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
