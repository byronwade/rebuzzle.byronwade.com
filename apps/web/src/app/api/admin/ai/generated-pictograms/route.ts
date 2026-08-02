import { NextResponse } from "next/server";
import { GeneratedPictogramReviewConflictError } from "@/ai/puzzle-agent/review/generated-pictogram-registry";
import { generatedPictogramRegistry } from "@/ai/puzzle-agent/review/generated-pictogram-registry-server";
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
        ? { report: await generatedPictogramRegistry.getReport(admin.id) }
        : await generatedPictogramRegistry.getNext(admin.id);
    return NextResponse.json({ success: true, ...result }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load generated assets";
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
        { success: false, error: "Invalid generated-asset response" },
        { status: 400 }
      );
    }
    const progress = await generatedPictogramRegistry.submitReview({
      reviewerId: admin.id,
      fixtureId: typeof body.fixtureId === "string" ? body.fixtureId : "",
      guess: typeof body.guess === "string" ? body.guess : undefined,
      uncertain: body.uncertain === true,
    });
    return NextResponse.json({ success: true, progress }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    if (error instanceof GeneratedPictogramReviewConflictError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    const message =
      error instanceof Error ? error.message : "Failed to save generated-asset response";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
