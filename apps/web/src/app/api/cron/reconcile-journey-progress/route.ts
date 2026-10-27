import { NextResponse } from "next/server";
import { runJourneyProgressBackfill } from "@/db/daily-progress-backfill";
import { authorizeCron } from "@/lib/cron/auth";

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };

/** Daily safety net for durable progress-reconciliation markers. */
export async function GET(request: Request) {
  const authorization = authorizeCron(request);
  if (!authorization.ok) return authorization.response;

  try {
    const result = await runJourneyProgressBackfill({ onlyReconciliationPending: true });
    return NextResponse.json({ success: true, ...result }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    console.error("[Journey reconciliation] Cron failed:", error);
    return NextResponse.json(
      { success: false, error: "Journey reconciliation failed" },
      { status: 500, headers: PRIVATE_NO_STORE }
    );
  }
}
