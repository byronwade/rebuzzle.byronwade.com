import { NextResponse } from "next/server";
import { analyticsQueries } from "@/db/analytics-ops";
import { buildCacheControl } from "@/lib/http/cache-headers";

/**
 * GET /api/analytics/completion
 * Get puzzle completion rates
 */
export async function GET() {
  try {
    const completion = await analyticsQueries.getCompletionRates();

    return NextResponse.json(
      {
        success: true,
        completion: {
          overall: Math.round(completion.overall * 100) / 100,
          byDifficulty: Object.fromEntries(
            Object.entries(completion.byDifficulty).map(([key, value]) => [
              key,
              Math.round(value * 100) / 100,
            ])
          ),
          completed: completion.completed,
          abandoned: completion.abandoned,
          total: completion.total,
        },
      },
      {
        headers: {
          "Cache-Control": buildCacheControl({
            public: true,
            maxAge: 60,
            sMaxAge: 120,
            staleWhileRevalidate: 300,
          }),
        },
      }
    );
  } catch (error) {
    console.error("Error fetching completion rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch completion rates" },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }
}
