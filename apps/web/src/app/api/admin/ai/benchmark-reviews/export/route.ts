import { getExternalDatasetManifest } from "@/ai/puzzle-agent/benchmark/external-corpus";
import { benchmarkReviewService } from "@/ai/puzzle-agent/review/server";
import { verifyAdminAccess } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const admin = await verifyAdminAccess(request);
  if (!admin) {
    return Response.json({ error: "Admin access required" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const manifest = getExternalDatasetManifest(searchParams.get("datasetId") ?? "re-bus-hf-v1");
    const reviewFile = await benchmarkReviewService.exportReviews({
      datasetId: manifest.id,
      revision: searchParams.get("revision") ?? manifest.revision!,
    });
    return new Response(`${JSON.stringify(reviewFile, null, 2)}\n`, {
      headers: {
        "cache-control": "private, no-store",
        "content-disposition": `attachment; filename="${manifest.id}.reviews.json"`,
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export benchmark reviews";
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
