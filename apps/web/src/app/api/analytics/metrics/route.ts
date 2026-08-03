import { NextResponse } from "next/server";
import { analyticsQueries } from "@/db/analytics-ops";
import { buildCacheControl } from "@/lib/http/cache-headers";

/**
 * GET /api/analytics/metrics
 * Get aggregated analytics metrics
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get("summary") === "true";
    const cache = { public: true, maxAge: 60, sMaxAge: 120, staleWhileRevalidate: 300 };

    if (summary) {
      // Get full metrics summary
      const metrics = await analyticsQueries.getMetricsSummary();
      return NextResponse.json(
        { success: true, metrics },
        { headers: { "Cache-Control": buildCacheControl(cache) } }
      );
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

    return NextResponse.json(
      {
        success: true,
        metrics: {
          totalSignups,
          activeUsers,
        },
      },
      { headers: { "Cache-Control": buildCacheControl(cache) } }
    );
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }
}
