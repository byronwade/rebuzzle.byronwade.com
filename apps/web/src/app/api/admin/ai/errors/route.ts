import { NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/admin-auth";
import { aiErrorOps } from "@/db/ai-operations";
import type { AIError } from "@/db/models";
import { parseDate, parsePagination, sanitizeId } from "@/lib/api-validation";

/**
 * GET /api/admin/ai/errors
 * List AI errors with filtering and pagination
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

    const severity = searchParams.get("severity") as AIError["severity"] | null;
    const errorType = searchParams.get("errorType") as AIError["errorType"] | null;
    const resolved = searchParams.get("resolved");
    const startDate = parseDate(searchParams.get("startDate"));
    const endDate = parseDate(searchParams.get("endDate"));

    const options = {
      limit,
      severity: severity || undefined,
      errorType: errorType || undefined,
      resolved: resolved === "true" ? true : resolved === "false" ? false : undefined,
      startDate,
      endDate,
    };

    const [errors, patterns, unresolvedCritical] = await Promise.all([
      aiErrorOps.findRecent(options),
      aiErrorOps.getPatterns(options.startDate, options.endDate),
      aiErrorOps.getUnresolvedCritical(),
    ]);

    return NextResponse.json({
      errors,
      patterns,
      unresolvedCriticalCount: unresolvedCritical.length,
      page,
      limit,
    });
  } catch (error) {
    console.error("AI Errors API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI errors" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/ai/errors
 * Resolve an error
 */
export async function PATCH(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    }

    const body = await request.json();
    const { id: rawId, resolution } = body;

    // Sanitize ID
    const id = sanitizeId(rawId);

    if (!id || !resolution) {
      return NextResponse.json(
        { error: "id and resolution are required", code: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    // Validate resolution object has required fields
    if (typeof resolution !== "object" || !resolution.action || typeof resolution.action !== "string") {
      return NextResponse.json(
        { error: "resolution.action is required and must be a string", code: "INVALID_RESOLUTION" },
        { status: 400 }
      );
    }

    // Validate action is one of the allowed values
    const validActions = ["retry_succeeded", "fallback_succeeded", "manual_fix", "ignored", "config_changed"] as const;
    if (!validActions.includes(resolution.action)) {
      return NextResponse.json(
        { error: `resolution.action must be one of: ${validActions.join(", ")}`, code: "INVALID_ACTION" },
        { status: 400 }
      );
    }

    // Sanitize resolution fields
    const sanitizedResolution: {
      action: typeof validActions[number];
      notes?: string;
    } = {
      action: resolution.action as typeof validActions[number],
      notes: resolution.notes ? String(resolution.notes).slice(0, 2000) : undefined,
    };

    await aiErrorOps.resolve(id, sanitizedResolution);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("AI Error resolve API error:", error);
    return NextResponse.json(
      { error: "Failed to resolve error" },
      { status: 500 }
    );
  }
}
