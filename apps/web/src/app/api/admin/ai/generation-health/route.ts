import { NextResponse } from "next/server";
import {
  getGenerationSystemHealth,
  listRecentGenerationAudits,
  loadSimCalibration,
  measureWindowPerformance,
  resolveAdaptiveDifficultyForDate,
} from "@/ai/learning";
import { aiFeedbackOps, aiLearningEventOps } from "@/db/ai-operations";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * GET /api/admin/ai/generation-health
 * Professional observability for Apex + self-learning.
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const [health, window, adaptive, audits, learningEvents, simCalibration, unprocessedFeedback] =
      await Promise.all([
        getGenerationSystemHealth(),
        measureWindowPerformance({ lookbackDays: 7, minFinals: 8 }),
        resolveAdaptiveDifficultyForDate(new Date()),
        listRecentGenerationAudits(20),
        aiLearningEventOps.findRecent(20),
        loadSimCalibration(),
        aiFeedbackOps.countUnprocessed(),
      ]);

    return NextResponse.json({
      success: true,
      health,
      playerPressure: {
        finalPlays: window.finalPlays,
        solveRate: window.solveRate,
        medianSolveSeconds: window.medianSolveSeconds,
        abandonRate: window.abandonRate,
        tooEasy: window.tooEasy,
        tooHard: window.tooHard,
        difficultyDelta: window.difficultyDelta,
        notes: window.notes,
      },
      adaptiveDifficulty: adaptive,
      simCalibration,
      unprocessedFeedback,
      recentAudits: audits,
      recentLearningEvents: learningEvents,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Generation health API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch generation health" },
      { status: 500 }
    );
  }
}
