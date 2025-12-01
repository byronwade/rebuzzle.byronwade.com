import { NextResponse } from "next/server";
import { analyticsQueries } from "@/db/analytics-ops";

/**
 * GET /api/analytics/metrics
 * Get aggregated analytics metrics
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get("summary") === "true";

    if (summary) {
      // Get full metrics summary
      const metrics = await analyticsQueries.getMetricsSummary();
      return NextResponse.json({ success: true, metrics });
    }

    // Get individual metrics
    const [totalSignups, activeUsers] = await Promise.all([
      analyticsQueries.getTotalSignups(),
      Promise.all([
        analyticsQueries.getActiveUsers("day"),
        analyticsQueries.getActiveUsers("week"),
        analyticsQueries.getActiveUsers("month"),
      ]).then(([day, week, month]) => ({ day, week, month })),
    ]);

    return NextResponse.json({
      success: true,
      metrics: {
        totalSignups,
        activeUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}

