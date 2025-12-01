import { NextResponse } from "next/server";
import { generateMasterPuzzle } from "@/ai/advanced";
import type { MasterGenerationParams } from "@/ai/services/master-puzzle-orchestrator";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * POST /api/admin/puzzles/generate
 * Generate a single puzzle (preview mode - doesn't save to database)
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
      puzzleType = "rebus",
      difficulty = 7,
      category,
      theme,
      targetDate,
    }: {
      puzzleType?: string;
      difficulty?: number;
      category?: string;
      theme?: string;
      targetDate?: string;
    } = body;

    // Validate difficulty range (5-10 for challenging puzzles)
    const validatedDifficulty = Math.max(5, Math.min(10, difficulty));

    const params: MasterGenerationParams = {
      targetDifficulty: validatedDifficulty,
      puzzleType,
      category,
      theme,
      maxAttempts: 3,
    };

    console.log("[Admin] Generating puzzle with params:", params);

    const result = await generateMasterPuzzle(params);

    if (result.status !== "success") {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate puzzle",
          details: result.recommendations.join(", "),
        },
        { status: 500 }
      );
    }

    // Format puzzle for preview (don't save to database)
    const puzzleData = result.puzzle as any;
    const puzzlePreview = {
      puzzle: puzzleData.rebusPuzzle || puzzleData.puzzle || "",
      puzzleType,
      answer: puzzleData.answer,
      difficulty: puzzleData.difficulty,
      category: puzzleData.category || category || "general",
      explanation: puzzleData.explanation,
      hints: puzzleData.hints || [],
      publishedAt: targetDate
        ? new Date(targetDate).toISOString()
        : new Date().toISOString(),
      active: true,
      metadata: {
        qualityScore: result.metadata.qualityMetrics?.scores?.overall || 0,
        uniquenessScore: result.metadata.uniquenessScore || 0,
        difficultyProfile: result.metadata.difficultyProfile,
        generationAttempts: result.metadata.generationAttempts,
        generationTimeMs: result.metadata.generationTimeMs,
      },
    };

    return NextResponse.json({
      success: true,
      puzzle: puzzlePreview,
      metadata: {
        qualityMetrics: result.metadata.qualityMetrics,
        uniquenessScore: result.metadata.uniquenessScore,
        generationTimeMs: result.metadata.generationTimeMs,
        recommendations: result.recommendations,
      },
    });
  } catch (error) {
    console.error("Admin puzzle generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate puzzle",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
