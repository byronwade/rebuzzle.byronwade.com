import { eachDayOfInterval, format } from "date-fns";
import { NextResponse } from "next/server";
import { generateMasterPuzzle } from "@/ai/advanced";
import type { MasterGenerationParams } from "@/ai/services/master-puzzle-orchestrator";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * POST /api/admin/puzzles/generate-date-range
 * Generate puzzles for a date range (preview mode - doesn't save to database)
 */
export async function POST(request: Request) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }

    const body = await request.json();
    const {
      startDate,
      endDate,
      puzzleType = "rebus",
      difficulty = 7,
      category,
      theme,
    }: {
      startDate: string;
      endDate: string;
      puzzleType?: string;
      difficulty?: number;
      category?: string;
      theme?: string;
    } = body;

    if (!(startDate && endDate)) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    if (start > end) {
      return NextResponse.json({ error: "startDate must be before endDate" }, { status: 400 });
    }

    // Limit to 90 days for performance
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (days > 90) {
      return NextResponse.json({ error: "Date range cannot exceed 90 days" }, { status: 400 });
    }

    const dates = eachDayOfInterval({ start, end });
    const validatedDifficulty = Math.max(5, Math.min(10, difficulty));

    console.log(`[Admin] Generating puzzles for ${dates.length} dates...`);

    const puzzles: any[] = [];
    const errors: string[] = [];

    // Generate puzzles for each date
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      if (!date) continue;
      try {
        const params: MasterGenerationParams = {
          targetDifficulty: validatedDifficulty,
          puzzleType,
          category,
          theme,
          maxAttempts: 2,
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
            publishedAt: date.toISOString(),
            active: true,
            metadata: {
              qualityScore: result.metadata.qualityMetrics?.scores?.overall || 0,
              uniquenessScore: result.metadata.uniquenessScore || 0,
              difficultyProfile: result.metadata.difficultyProfile,
            },
            date: format(date, "yyyy-MM-dd"),
          });
        } else {
          errors.push(`${format(date, "yyyy-MM-dd")}: ${result.recommendations.join(", ")}`);
        }
      } catch (error) {
        errors.push(
          `${format(date, "yyyy-MM-dd")}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      puzzles,
      metadata: {
        dateRange: {
          start: format(start, "yyyy-MM-dd"),
          end: format(end, "yyyy-MM-dd"),
          days: dates.length,
        },
        generated: puzzles.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("Admin date range puzzle generation error:", error);
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
