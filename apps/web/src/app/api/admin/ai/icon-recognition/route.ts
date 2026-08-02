import { NextResponse } from "next/server";
import { iconRecognitionService } from "@/ai/puzzle-agent/review/icon-recognition-server";
import { IconRecognitionConflictError } from "@/ai/puzzle-agent/review/icon-recognition-service";
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
    if (mode === "report") {
      const result = await iconRecognitionService.getReport(admin.id);
      return NextResponse.json({ success: true, ...result }, { headers: PRIVATE_NO_STORE });
    }
    const result = await iconRecognitionService.getNext(admin.id);
    return NextResponse.json({ success: true, ...result }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load recognition panel";
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
        { success: false, error: "Invalid recognition response" },
        { status: 400 }
      );
    }
    const progress = await iconRecognitionService.submit({
      reviewerId: admin.id,
      fixtureId: typeof body.fixtureId === "string" ? body.fixtureId : "",
      guess: typeof body.guess === "string" ? body.guess : undefined,
      uncertain: body.uncertain === true,
    });
    return NextResponse.json({ success: true, progress }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    if (error instanceof IconRecognitionConflictError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Failed to save recognition response";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
