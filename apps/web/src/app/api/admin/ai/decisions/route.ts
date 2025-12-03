import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { aiDecisionOps } from "@/db/ai-operations";
import type { AIDecision } from "@/db/models";
import { parseDate, parsePagination, sanitizeId, sanitizeString } from "@/lib/api-validation";

/**
 * GET /api/admin/ai/decisions
 * List AI decisions with filtering and pagination
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // Parse and validate pagination parameters
    const { page, limit } = parsePagination(
      searchParams.get("page"),
      searchParams.get("limit")
    );

    const decisionType = searchParams.get("type") as AIDecision["decisionType"] | null;
    const success = searchParams.get("success");
    const startDate = parseDate(searchParams.get("startDate"));
    const endDate = parseDate(searchParams.get("endDate"));
    const provider = sanitizeString(searchParams.get("provider"), 100);
    const model = sanitizeString(searchParams.get("model"), 200);
    const operationId = sanitizeId(searchParams.get("operationId"));

    // If operationId is provided, get all decisions for that operation
    if (operationId) {
      const decisions = await aiDecisionOps.findByOperationId(operationId);
      return NextResponse.json({
        decisions,
        total: decisions.length,
        page: 1,
        limit: decisions.length,
        totalPages: 1,
      });
    }

    // Build filter options
    const options: Parameters<typeof aiDecisionOps.findRecent>[0] = {
      limit,
      decisionType: decisionType || undefined,
      success: success === "true" ? true : success === "false" ? false : undefined,
      startDate,
      endDate,
      provider,
      model,
    };

    const decisions = await aiDecisionOps.findRecent(options);

    // Get stats for the same filters
    const stats = await aiDecisionOps.getStats(
      options.startDate,
      options.endDate
    );

    return NextResponse.json({
      decisions,
      stats,
      page,
      limit,
      // Note: For a real pagination, we'd need to add count queries
      // This is simplified for now
    });
  } catch (error) {
    console.error("AI Decisions API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI decisions" },
      { status: 500 }
    );
  }
}
