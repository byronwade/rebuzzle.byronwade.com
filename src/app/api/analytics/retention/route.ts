import { NextResponse } from "next/server";
import { analyticsQueries } from "@/db/analytics-ops";

/**
 * GET /api/analytics/retention
 * Get user retention rates
 */
export async function GET() {
  try {
    const retention = await analyticsQueries.getUserRetention();

    return NextResponse.json({
      success: true,
      retention: {
        day1: Math.round(retention.day1 * 100) / 100,
        day7: Math.round(retention.day7 * 100) / 100,
        day30: Math.round(retention.day30 * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Error fetching retention:", error);
    return NextResponse.json(
      { error: "Failed to fetch retention data" },
      { status: 500 }
    );
  }
}

