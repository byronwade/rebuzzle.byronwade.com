import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { aiLearningEventOps } from "@/db/ai-operations";
import { parseDate, sanitizeId, validateEnum } from "@/lib/api-validation";

/**
 * GET /api/admin/ai/learning
 * List AI learning events
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = validateEnum(
      searchParams.get("status"),
      ["proposed", "approved", "applied", "reverted"] as const
    );
    const configId = sanitizeId(searchParams.get("configId"));
    const startDate = parseDate(searchParams.get("startDate"));
    const endDate = parseDate(searchParams.get("endDate"));

    // Get events by filter
    let events;
    if (status) {
      events = await aiLearningEventOps.findByStatus(status);
    } else if (configId) {
      events = await aiLearningEventOps.findByConfigId(configId);
    } else {
      events = await aiLearningEventOps.findRecent();
    }

    // Get impact summary
    const impactSummary = await aiLearningEventOps.getImpactSummary(startDate, endDate);

    return NextResponse.json({
      events,
      impactSummary,
    });
  } catch (error) {
    console.error("AI Learning API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI learning events" },
      { status: 500 }
    );
  }
}
