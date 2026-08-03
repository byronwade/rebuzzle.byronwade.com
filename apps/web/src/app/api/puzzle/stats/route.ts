import { NextResponse } from "next/server";
import { getQuotaStats } from "@/ai";
import { buildCacheControl } from "@/lib/http/cache-headers";

export async function GET() {
  try {
    // Get AI quota usage stats
    const quotaStats = getQuotaStats();

    return NextResponse.json(
      {
        success: true,
        stats: {
          aiProvider: "Google Gemini",
          quotaUsage: quotaStats,
          generationMethod: "AI Master Orchestrator",
          features: {
            uniquenessGuarantee: true,
            difficultyCalibration: true,
            qualityAssurance: true,
            intelligentAgent: true,
          },
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
    console.error("Error getting puzzle stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: { "Cache-Control": buildCacheControl({ private: true }) } }
    );
  }
}
