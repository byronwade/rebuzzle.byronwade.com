import { NextResponse } from "next/server";
import { puzzlePlaytestBackfillService } from "@/ai/puzzle-agent/review/puzzle-playtest-backfill-server";
import { verifyAdminAccess } from "@/lib/admin-auth";

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid backfill request" },
        { status: 400 }
      );
    }
    const report = await puzzlePlaytestBackfillService.run({
      // Fail safe: only an explicit false mutates the queue.
      dryRun: body.dryRun !== false,
      limit: typeof body.limit === "number" ? body.limit : undefined,
    });
    return NextResponse.json({ success: true, report }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to backfill puzzle playtests";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
