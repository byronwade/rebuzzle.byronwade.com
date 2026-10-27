import { NextResponse } from "next/server";
import { nativeGrowthEventOps } from "@/db/analytics-ops";
import { verifyAdminAccess } from "@/lib/admin-auth";

const noStore = { "Cache-Control": "private, no-store" };

/** GET /api/admin/native-funnel — aggregate-only native daily funnel summary. */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 401, headers: noStore }
      );
    }

    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const summary = await nativeGrowthEventOps.getSummary(start, end);
    return NextResponse.json(
      { period: { start: start.toISOString(), end: end.toISOString() }, summary },
      { headers: noStore }
    );
  } catch (error) {
    console.error("Native funnel API error:", error);
    return NextResponse.json(
      { error: "Native funnel analytics are temporarily unavailable." },
      { status: 503, headers: noStore }
    );
  }
}
