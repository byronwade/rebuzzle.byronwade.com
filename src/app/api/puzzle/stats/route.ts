import { NextResponse } from "next/server"
import { getQuotaStats } from "@/ai"

export async function GET() {
  try {
    // Get AI quota usage stats
    const quotaStats = getQuotaStats()

    return NextResponse.json({
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
    })
  } catch (error) {
    console.error("Error getting puzzle stats:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get stats",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
