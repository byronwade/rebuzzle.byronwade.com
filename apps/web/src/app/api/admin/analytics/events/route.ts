import { NextResponse } from "next/server";
import type { AnalyticsEvent } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import { verifyAdminAccess } from "@/lib/admin-auth";

/**
 * GET /api/admin/analytics/events
 * Get recent analytics events for admin dashboard
 */
export async function GET(request: Request) {
  try {
    // Verify admin access
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10);
    const eventType = searchParams.get("eventType");

    const analyticsEventsCollection = getCollection<AnalyticsEvent>("analyticsEvents");

    const query: any = {};
    if (eventType && eventType !== "all") {
      query.eventType = eventType;
    }

    const events = await analyticsEventsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      events: events.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        userId: event.userId,
        sessionId: event.sessionId,
        timestamp: event.timestamp,
        metadata: event.metadata,
      })),
    });
  } catch (error) {
    console.error("Admin analytics events error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch analytics events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
