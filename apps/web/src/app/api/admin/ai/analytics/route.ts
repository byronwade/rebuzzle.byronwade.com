import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { aiDecisionOps, aiErrorOps, aiFeedbackOps, aiLearningEventOps } from "@/db/ai-operations";
import { parseDate, validateEnum } from "@/lib/api-validation";

/**
 * GET /api/admin/ai/analytics
 * Get AI analytics overview and time-series data
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "overview";
    const startDate = parseDate(searchParams.get("startDate"));
    const endDate = parseDate(searchParams.get("endDate"));
    const intervalParam = searchParams.get("interval");
    const interval = validateEnum(intervalParam, ["hour", "day", "week"] as const) ?? "day";

    const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const start = startDate ?? defaultStart;
    const end = endDate ?? new Date();

    if (view === "time-series") {
      const timeSeries = await aiDecisionOps.getTimeSeries(interval, start, end);
      return NextResponse.json({ timeSeries, interval, startDate: start, endDate: end });
    }

    if (view === "model-performance") {
      const stats = await aiDecisionOps.getStats(start, end);
      return NextResponse.json({
        byProvider: stats.byProvider,
        byType: stats.byType,
        successRate: stats.successRate,
        avgDurationMs: stats.avgDurationMs,
        totalCost: stats.totalCost,
      });
    }

    // Overview (default)
    const [decisionStats, errorPatterns, feedbackTrend, learningImpact] = await Promise.all([
      aiDecisionOps.getStats(start, end),
      aiErrorOps.getPatterns(start, end),
      aiFeedbackOps.getSatisfactionTrend("day", start, end),
      aiLearningEventOps.getImpactSummary(start, end),
    ]);

    // Calculate summary metrics
    const avgSatisfaction = feedbackTrend.length > 0
      ? feedbackTrend.reduce((sum, d) => sum + d.avgSatisfaction, 0) / feedbackTrend.length
      : 0;

    const totalErrors = errorPatterns.reduce((sum, p) => sum + p.count, 0);
    const unresolvedErrors = errorPatterns.reduce((sum, p) => sum + (p.count - p.resolvedCount), 0);

    return NextResponse.json({
      overview: {
        totalDecisions: decisionStats.totalDecisions,
        successRate: decisionStats.successRate,
        avgDurationMs: decisionStats.avgDurationMs,
        avgTokensPerDecision: decisionStats.avgTokens,
        totalCost: decisionStats.totalCost,
        avgSatisfaction,
        totalErrors,
        unresolvedErrors,
        learningEventsApplied: learningImpact.applied,
        avgQualityChange: learningImpact.avgQualityChange,
      },
      decisionsByType: decisionStats.byType,
      decisionsByProvider: decisionStats.byProvider,
      topErrorPatterns: errorPatterns.slice(0, 5),
      satisfactionTrend: feedbackTrend,
      period: { start, end },
    });
  } catch (error) {
    console.error("AI Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI analytics" },
      { status: 500 }
    );
  }
}
