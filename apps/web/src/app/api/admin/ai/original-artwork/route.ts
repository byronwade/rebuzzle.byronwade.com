import { NextResponse } from "next/server";
import { iconRecognitionService } from "@/ai/puzzle-agent/review/icon-recognition-server";
import {
  originalArtworkPromotionRepository,
  originalArtworkPromotionService,
} from "@/ai/puzzle-agent/review/original-artwork-promotion-server";
import { listOriginalPictogramCandidates } from "@/ai/puzzle-agent/visual/original-pictograms";
import { verifyAdminAccess } from "@/lib/admin-auth";

const headers = { "Cache-Control": "private, no-store" };
const response = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
async function editor(request: Request) {
  const admin = await verifyAdminAccess(request);
  if (!admin) return { denied: response({ error: "Admin access required" }, 401) };
  const panel = await iconRecognitionService.getNext(admin.id, "originals");
  if (!panel.progress.complete)
    return {
      denied: response(
        { error: "Complete the blind originals panel before managing artwork" },
        403
      ),
    };
  return { admin };
}
function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Artwork operation failed";
  return response({ error: message }, message.includes("changed") ? 409 : 400);
}
export async function GET(request: Request) {
  try {
    const access = await editor(request);
    if (access.denied) return access.denied;
    const { report } = await iconRecognitionService.getReport(access.admin!.id, "originals");
    const eligible = new Set(report.promotionEligibleAssets.map((asset) => asset.assetId));
    const assets = await Promise.all(
      listOriginalPictogramCandidates().map(async (asset) => {
        const record = await originalArtworkPromotionRepository.find(asset.assetId);
        return {
          assetId: asset.assetId,
          concept: asset.concept,
          status: record?.status ?? "candidate",
          statusVersion: record?.statusVersion ?? 0,
          recognitionEligible: eligible.has(asset.assetId),
          auditHistory:
            record?.auditHistory
              .slice(-10)
              .map((event) => ({
                action: event.action,
                reason: event.reason,
                actorId: event.actorId,
                createdAt: event.createdAt.toISOString(),
              })) ?? [],
        };
      })
    );
    return response({ catalogVersion: report.catalogVersion, assets });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const access = await editor(request);
    if (access.denied) return access.denied;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      return response({ error: "Invalid artwork action" }, 400);
    const input = body as Record<string, unknown>;
    if (
      typeof input.assetId !== "string" ||
      !listOriginalPictogramCandidates().some((asset) => asset.assetId === input.assetId) ||
      typeof input.expectedStatusVersion !== "number" ||
      !Number.isSafeInteger(input.expectedStatusVersion) ||
      input.expectedStatusVersion < 0
    )
      return response({ error: "Invalid artwork identity or status version" }, 400);
    const common = {
      assetId: input.assetId,
      actorId: access.admin!.id,
      expectedStatusVersion: input.expectedStatusVersion,
    };
    let record;
    if (
      input.action === "approve" &&
      typeof input.expectedCatalogVersion === "string" &&
      input.expectedCatalogVersion.length <= 300
    ) {
      record = await originalArtworkPromotionService.promote({
        ...common,
        expectedCatalogVersion: input.expectedCatalogVersion,
      });
    } else if (
      input.action === "quarantine" &&
      typeof input.reason === "string" &&
      input.reason.trim() &&
      input.reason.length <= 300
    ) {
      record = await originalArtworkPromotionService.quarantine({
        ...common,
        reason: input.reason,
      });
    } else return response({ error: "Invalid artwork action" }, 400);
    return response({
      assetId: record.assetId,
      status: record.status,
      statusVersion: record.statusVersion,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
