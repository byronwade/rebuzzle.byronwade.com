import { NextResponse } from "next/server";
import { puzzlePlaytestService } from "@/ai/puzzle-agent/review/puzzle-playtest-server";
import { authorizeCron } from "@/lib/cron/auth";

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * Read-only operational evidence snapshot.
 *
 * This route intentionally excludes candidate identities and answers. It is
 * suitable for automated release audits and never advances candidate status.
 */
export async function GET(request: Request) {
  const authorization = authorizeCron(request);
  if (!authorization.ok) return authorization.response;

  try {
    const report = await puzzlePlaytestService.getReport("operational-audit", new Date(), {
      readOnly: true,
    });
    const { visibleCandidates: _privateCandidates, ...aggregateReport } = report;

    return NextResponse.json(
      { success: true, report: aggregateReport },
      { headers: PRIVATE_NO_STORE }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to audit puzzle playtests";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: PRIVATE_NO_STORE }
    );
  }
}
