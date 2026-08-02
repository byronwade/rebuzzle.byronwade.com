import { NextResponse } from "next/server";
import { getExternalDatasetManifest } from "@/ai/puzzle-agent/benchmark/external-corpus";
import { BenchmarkReviewConflictError } from "@/ai/puzzle-agent/review/benchmark-review-service";
import { benchmarkReviewService } from "@/ai/puzzle-agent/review/server";
import type { BenchmarkReviewDecision, BenchmarkReviewStatus } from "@/db/models";
import { verifyAdminAccess } from "@/lib/admin-auth";

function integerParam(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const manifest = getExternalDatasetManifest(searchParams.get("datasetId") ?? "re-bus-hf-v1");
    const statusParam = searchParams.get("status") ?? "pending";
    const statuses = ["all", "pending", "approved", "rejected"] as const;
    const status = statuses.includes(statusParam as (typeof statuses)[number])
      ? (statusParam as BenchmarkReviewStatus | "all")
      : "pending";
    const queue = await benchmarkReviewService.getQueue({
      datasetId: manifest.id,
      revision: searchParams.get("revision") ?? manifest.revision!,
      status,
      page: integerParam(searchParams.get("page"), 1),
      limit: integerParam(searchParams.get("limit"), 20),
    });
    return NextResponse.json({ success: true, queue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load benchmark reviews";
    const status = message.includes("has not been imported") ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdminAccess(request);
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 401 });
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid review decision" }, { status: 400 });
    }
    const updated = await benchmarkReviewService.decide({
      id: typeof body.id === "string" ? body.id : "",
      expectedVersion: typeof body.expectedVersion === "number" ? body.expectedVersion : -1,
      rights: body.rights as BenchmarkReviewDecision,
      answer: body.answer as BenchmarkReviewDecision,
      actorUserId: admin.id,
      note: typeof body.note === "string" ? body.note : undefined,
    });
    return NextResponse.json({ success: true, review: updated });
  } catch (error) {
    if (error instanceof BenchmarkReviewConflictError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Failed to record review";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
