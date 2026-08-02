import { NextResponse } from "next/server";
import { puzzlePlaytestService } from "@/ai/puzzle-agent/review/puzzle-playtest-server";
import { PuzzlePlaytestConflictError } from "@/ai/puzzle-agent/review/puzzle-playtest-service";
import type { PuzzlePlaytestFailureReason } from "@/db/models";
import { verifyAdminAccess } from "@/lib/admin-auth";

const PRIVATE_NO_STORE = { "Cache-Control": "private, no-store" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    const mode = new URL(request.url).searchParams.get("mode");
    const result =
      mode === "report"
        ? { report: await puzzlePlaytestService.getReport(admin.id) }
        : await puzzlePlaytestService.getNext(admin.id);
    return NextResponse.json({ success: true, ...result }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load puzzle playtests";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid playtest response" },
        { status: 400 }
      );
    }
    const progress = await puzzlePlaytestService.submitReview({
      reviewerId: admin.id,
      fixtureId: typeof body.fixtureId === "string" ? body.fixtureId : "",
      guess: typeof body.guess === "string" ? body.guess : undefined,
      gaveUp: body.gaveUp === true,
      failureReason:
        typeof body.failureReason === "string"
          ? (body.failureReason as PuzzlePlaytestFailureReason)
          : undefined,
      confidence: typeof body.confidence === "number" ? body.confidence : undefined,
      elapsedMs: typeof body.elapsedMs === "number" ? body.elapsedMs : undefined,
    });
    return NextResponse.json({ success: true, progress }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    if (error instanceof PuzzlePlaytestConflictError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Failed to save playtest response";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
