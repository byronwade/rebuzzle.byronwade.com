import { NextResponse } from "next/server";
import { benchmarkReviewService } from "@/ai/puzzle-agent/review/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

function artifactFromBody(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return (value as Record<string, unknown>).artifact;
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    const artifact = artifactFromBody(await request.json());
    const result = await benchmarkReviewService.importArtifact({
      artifact,
      actorUserId: admin.id,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import benchmark corpus";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
