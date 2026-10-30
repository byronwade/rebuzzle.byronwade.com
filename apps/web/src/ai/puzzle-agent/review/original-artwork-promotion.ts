import { createHash, randomUUID } from "node:crypto";
import { listOriginalPictogramCandidates } from "../visual/original-pictograms";
import { sanitizePictogramSvg } from "../visual/sanitize-svg";
import {
  HUMAN_ICON_RECOGNITION_CONTRACT_VERSION,
  type IconRecognitionCalibrationReport,
} from "./icon-recognition-service";

export const ORIGINAL_ARTWORK_PROMOTION_POLICY = "original-artwork-promotion-v1";
export type OriginalArtworkPromotion = {
  _id: string;
  assetId: string;
  assetSha256: string;
  styleId: string;
  readingPolicyVersion: string;
  contractVersion: string;
  catalogVersion: string;
  promotionPolicy: string;
  qualificationEvidenceIds: string[];
  status: "approved" | "quarantined";
  statusVersion: number;
  updatedAt: Date;
  auditHistory: Array<{
    id: string;
    actorId: string;
    action: "approved" | "quarantined";
    reason: string;
    createdAt: Date;
    evidence?: {
      assetSha256: string;
      catalogVersion: string;
      contractVersion: string;
      readingPolicyVersion: string;
      styleId: string;
      qualificationEvidenceIds: string[];
    };
  }>;
};
export type OriginalArtworkPromotionRepository = {
  find(assetId: string): Promise<OriginalArtworkPromotion | null>;
  save(record: OriginalArtworkPromotion, expectedStatusVersion: number): Promise<boolean>;
};

function actor(value: string) {
  const id = value.trim();
  if (!id || id.length > 100) throw new Error("An authenticated editor is required");
  return id;
}
function exactEvidence(report: IconRecognitionCalibrationReport, assetId: string) {
  if (
    report.panelId !== "originals" ||
    report.contractVersion !== HUMAN_ICON_RECOGNITION_CONTRACT_VERSION
  )
    return null;
  const source = listOriginalPictogramCandidates().find((asset) => asset.assetId === assetId);
  const evidence = report.promotionEligibleAssets.find((asset) => asset.assetId === assetId);
  if (!source || !evidence) return null;
  const svg = sanitizePictogramSvg(source.svg);
  if (
    !svg ||
    evidence.assetSha256 !== createHash("sha256").update(svg).digest("hex") ||
    evidence.styleId !== source.styleId ||
    evidence.readingPolicyVersion !== source.readingPolicyVersion
  )
    return null;
  return evidence;
}

/** Server-derived recognition only. Client approval flags and artwork bytes are never inputs. */
export function createOriginalArtworkPromotionService(
  repository: OriginalArtworkPromotionRepository,
  loadCurrentReport: () => Promise<IconRecognitionCalibrationReport>
) {
  return {
    async promote(input: {
      assetId: string;
      actorId: string;
      expectedCatalogVersion: string;
      expectedStatusVersion: number;
    }) {
      const actorId = actor(input.actorId);
      const report = await loadCurrentReport();
      if (report.catalogVersion !== input.expectedCatalogVersion)
        throw new Error("Recognition evidence changed; reload the report");
      const evidence = exactEvidence(report, input.assetId);
      if (!evidence) throw new Error("This artwork lacks qualifying recognition evidence");
      const previous = await repository.find(input.assetId);
      if ((previous?.statusVersion ?? 0) !== input.expectedStatusVersion)
        throw new Error("Artwork approval changed; reload the report");
      const now = new Date();
      const record: OriginalArtworkPromotion = {
        _id: input.assetId,
        assetId: input.assetId,
        assetSha256: evidence.assetSha256,
        styleId: evidence.styleId,
        readingPolicyVersion: evidence.readingPolicyVersion,
        contractVersion: report.contractVersion,
        catalogVersion: report.catalogVersion,
        promotionPolicy: ORIGINAL_ARTWORK_PROMOTION_POLICY,
        qualificationEvidenceIds: [...report.qualificationEvidenceIds],
        status: "approved",
        statusVersion: input.expectedStatusVersion + 1,
        updatedAt: now,
        auditHistory: [
          ...(previous?.auditHistory ?? []),
          {
            id: randomUUID(),
            actorId,
            action: "approved",
            reason: "Exact authored artwork passed the current calibrated recognition panel",
            createdAt: now,
            evidence: {
              assetSha256: evidence.assetSha256,
              catalogVersion: report.catalogVersion,
              contractVersion: report.contractVersion,
              readingPolicyVersion: evidence.readingPolicyVersion,
              styleId: evidence.styleId,
              qualificationEvidenceIds: [...report.qualificationEvidenceIds],
            },
          },
        ],
      };
      if (!(await repository.save(record, input.expectedStatusVersion)))
        throw new Error("Artwork approval changed; reload the report");
      return record;
    },
    async findEligible(assetId: string) {
      const record = await repository.find(assetId);
      if (
        record?.status !== "approved" ||
        record.promotionPolicy !== ORIGINAL_ARTWORK_PROMOTION_POLICY
      )
        return null;
      const report = await loadCurrentReport();
      const evidence = exactEvidence(report, assetId);
      if (
        !evidence ||
        record._id !== assetId ||
        record.assetId !== assetId ||
        record.assetSha256 !== evidence.assetSha256 ||
        record.styleId !== evidence.styleId ||
        record.readingPolicyVersion !== evidence.readingPolicyVersion ||
        record.contractVersion !== report.contractVersion ||
        record.catalogVersion !== report.catalogVersion
      )
        return null;
      const currentIds = new Set(report.qualificationEvidenceIds);
      if (
        !record.qualificationEvidenceIds.length ||
        !record.qualificationEvidenceIds.every((id) => currentIds.has(id))
      )
        return null;
      return record;
    },
    async quarantine(input: {
      assetId: string;
      actorId: string;
      reason: string;
      expectedStatusVersion: number;
    }) {
      const actorId = actor(input.actorId);
      const reason = input.reason.trim().slice(0, 300);
      if (!reason) throw new Error("A quarantine reason is required");
      const previous = await repository.find(input.assetId);
      if (!previous || previous.statusVersion !== input.expectedStatusVersion)
        throw new Error("Artwork approval changed; reload the report");
      const now = new Date();
      const record: OriginalArtworkPromotion = {
        ...previous,
        status: "quarantined",
        statusVersion: previous.statusVersion + 1,
        updatedAt: now,
        auditHistory: [
          ...previous.auditHistory,
          { id: randomUUID(), actorId, action: "quarantined", reason, createdAt: now },
        ],
      };
      if (!(await repository.save(record, input.expectedStatusVersion)))
        throw new Error("Artwork approval changed; reload the report");
      return record;
    },
  };
}
