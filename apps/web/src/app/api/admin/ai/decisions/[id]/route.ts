import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { aiDecisionOps } from "@/db/ai-operations";

/**
 * GET /api/admin/ai/decisions/[id]
 * Get a single AI decision with full details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const { id } = await params;
    const decision = await aiDecisionOps.findById(id);

    if (!decision) {
      return NextResponse.json({ error: "Decision not found" }, { status: 404 });
    }

    // If this decision is part of an operation, get related decisions
    let relatedDecisions = null;
    if (decision.operationId) {
      const allInOperation = await aiDecisionOps.findByOperationId(decision.operationId);
      if (allInOperation.length > 1) {
        relatedDecisions = allInOperation
          .filter(d => d.id !== id)
          .map(d => ({
            id: d.id,
            decisionType: d.decisionType,
            timestamp: d.timestamp,
            success: d.output.success,
            durationMs: d.durationMs,
          }));
      }
    }

    return NextResponse.json({
      decision,
      relatedDecisions,
    });
  } catch (error) {
    console.error("AI Decision detail API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI decision" },
      { status: 500 }
    );
  }
}
