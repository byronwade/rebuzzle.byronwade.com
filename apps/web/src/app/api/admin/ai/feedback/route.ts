import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { aiFeedbackOps } from "@/db/ai-operations";
import { parseDate, sanitizeId } from "@/lib/api-validation";

/**
 * GET /api/admin/ai/feedback
 * List AI feedback with filtering and aggregation
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const puzzleId = sanitizeId(searchParams.get("puzzleId"));
    const userId = sanitizeId(searchParams.get("userId"));
    const startDate = parseDate(searchParams.get("startDate"));
    const endDate = parseDate(searchParams.get("endDate"));
    const groupByParam = searchParams.get("groupBy");

    // Validate groupBy parameter
    const validGroupByValues = ["puzzleType", "difficulty", "category", "feedbackType"] as const;
    const groupBy = groupByParam && validGroupByValues.includes(groupByParam as typeof validGroupByValues[number])
      ? (groupByParam as typeof validGroupByValues[number])
      : null;

    // If groupBy is specified, return aggregated data
    if (groupBy) {
      const aggregate = await aiFeedbackOps.getAggregate(
        groupBy,
        startDate,
        endDate
      );

      return NextResponse.json({ aggregate, groupBy });
    }

    // If puzzleId is specified, get feedback for that puzzle
    if (puzzleId) {
      const feedback = await aiFeedbackOps.findByPuzzleId(puzzleId);
      return NextResponse.json({ feedback, puzzleId });
    }

    // If userId is specified, get feedback from that user
    if (userId) {
      const feedback = await aiFeedbackOps.findByUserId(userId);
      return NextResponse.json({ feedback, userId });
    }

    // Otherwise get satisfaction trend
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [trend, unprocessedCount] = await Promise.all([
      aiFeedbackOps.getSatisfactionTrend(
        "day",
        startDate ?? thirtyDaysAgo,
        endDate ?? now
      ),
      aiFeedbackOps.countUnprocessed(),
    ]);

    return NextResponse.json({
      trend,
      unprocessedCount,
    });
  } catch (error) {
    console.error("AI Feedback API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI feedback" },
      { status: 500 }
    );
  }
}
