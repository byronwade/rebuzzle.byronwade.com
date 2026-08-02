import { randomUUID } from "node:crypto";
import type {
  BenchmarkReviewDecision,
  BenchmarkReviewDecisionEvent,
  BenchmarkReviewFixture,
  BenchmarkReviewStatus,
} from "../../../db/models";
import {
  assertExternalCorpusArtifact,
  type ExternalCorpusArtifact,
  type ExternalCorpusReadinessReport,
  type ExternalPuzzleFixture,
  type ExternalPuzzleReviewFile,
  getExternalDatasetManifest,
  scoreExternalCorpusReadiness,
} from "../benchmark/external-corpus";

export type BenchmarkDatasetIdentity = { datasetId: string; revision: string };

export type BenchmarkReviewQueueQuery = BenchmarkDatasetIdentity & {
  status?: BenchmarkReviewStatus | "all";
  page?: number;
  limit?: number;
};

export type BenchmarkReviewProgress = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  readiness: ExternalCorpusReadinessReport;
};

export type BenchmarkReviewQueue = {
  items: BenchmarkReviewFixture[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  progress: BenchmarkReviewProgress;
};

export type BenchmarkReviewRepository = {
  upsertFixtures(
    fixtures: BenchmarkReviewFixture[]
  ): Promise<{ inserted: number; existing: number }>;
  listQueue(input: Required<BenchmarkReviewQueueQuery>): Promise<{
    items: BenchmarkReviewFixture[];
    total: number;
  }>;
  listDataset(identity: BenchmarkDatasetIdentity): Promise<BenchmarkReviewFixture[]>;
  recordDecision(input: {
    id: string;
    expectedVersion: number;
    rights: BenchmarkReviewDecision;
    answer: BenchmarkReviewDecision;
    status: BenchmarkReviewStatus;
    reviewerId: string;
    note?: string;
    event: BenchmarkReviewDecisionEvent;
    updatedAt: Date;
  }): Promise<BenchmarkReviewFixture | null>;
};

export type BenchmarkReviewArtifactValidator = (
  value: unknown
) => asserts value is ExternalCorpusArtifact;

export class BenchmarkReviewConflictError extends Error {
  constructor() {
    super("Benchmark review changed since it was loaded; refresh before deciding again");
    this.name = "BenchmarkReviewConflictError";
  }
}

function cleanText(value: string | undefined, maxLength: number): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function normalizeIdentity(input: BenchmarkDatasetIdentity): BenchmarkDatasetIdentity {
  const datasetId = cleanText(input.datasetId, 100);
  const revision = cleanText(input.revision, 100);
  if (!datasetId || !revision) throw new Error("Dataset id and revision are required");
  const manifest = getExternalDatasetManifest(datasetId);
  if (manifest.metadataAccess !== "pinned-import" || manifest.revision !== revision) {
    throw new Error("Dataset identity is not an approved pinned benchmark");
  }
  return { datasetId, revision };
}

function statusFor(
  rights: BenchmarkReviewDecision,
  answer: BenchmarkReviewDecision
): BenchmarkReviewStatus {
  if (rights === "rejected" || answer === "rejected") return "rejected";
  if (rights === "approved" && answer === "approved") return "approved";
  return "pending";
}

function fixtureDocument(input: {
  fixture: ExternalPuzzleFixture;
  artifact: ExternalCorpusArtifact;
  actorUserId: string;
  now: Date;
}): BenchmarkReviewFixture {
  const { fixture, artifact, actorUserId, now } = input;
  return {
    id: `benchmark-review:${artifact.dataset.revision}:${fixture.id}`,
    fixtureId: fixture.id,
    datasetId: artifact.dataset.id,
    revision: artifact.dataset.revision!,
    metadataSha256: artifact.metadataSha256,
    fixtureSha256: artifact.fixtureSha256,
    datasetRow: fixture.datasetRow,
    imageUrl: fixture.imageUrl,
    sourceUrl: fixture.sourceUrl,
    answer: fixture.answer,
    hint: fixture.hint,
    difficulty: fixture.difficulty,
    reasoningUnits: fixture.reasoningUnits,
    reasoningFeatures: [...fixture.reasoningFeatures],
    isAugmented: false,
    rightsDecision: "pending",
    answerDecision: "pending",
    reviewStatus: "pending",
    decisionHistory: [],
    version: 0,
    importedBy: actorUserId,
    importedAt: now,
    updatedAt: now,
  };
}

function asExternalFixture(row: BenchmarkReviewFixture): ExternalPuzzleFixture {
  return {
    id: row.fixtureId,
    datasetId: row.datasetId,
    datasetRow: row.datasetRow,
    imageUrl: row.imageUrl,
    sourceUrl: row.sourceUrl,
    answer: row.answer,
    hint: row.hint,
    difficulty: row.difficulty,
    reasoningUnits: row.reasoningUnits,
    reasoningFeatures: row.reasoningFeatures as ExternalPuzzleFixture["reasoningFeatures"],
    isAugmented: false,
    reviewStatus: row.reviewStatus,
    review:
      row.reviewStatus === "pending"
        ? undefined
        : {
            rights: row.rightsDecision,
            answer: row.answerDecision,
            reviewer: row.reviewerId,
            reviewedAt: row.reviewedAt?.toISOString(),
            note: row.reviewNote,
          },
    eligibleForEvaluation: row.reviewStatus === "approved",
  };
}

function progressFor(rows: BenchmarkReviewFixture[]): BenchmarkReviewProgress {
  const identity = rows[0]
    ? { datasetId: rows[0].datasetId, revision: rows[0].revision }
    : undefined;
  if (!identity) throw new Error("Benchmark review dataset has not been imported");
  const manifest = getExternalDatasetManifest(identity.datasetId);
  return {
    total: rows.length,
    pending: rows.filter((row) => row.reviewStatus === "pending").length,
    approved: rows.filter((row) => row.reviewStatus === "approved").length,
    rejected: rows.filter((row) => row.reviewStatus === "rejected").length,
    readiness: scoreExternalCorpusReadiness({
      manifest,
      rows: rows.map(asExternalFixture),
      invalidRows: 0,
    }),
  };
}

export function createBenchmarkReviewService(
  repository: BenchmarkReviewRepository,
  validateArtifact: BenchmarkReviewArtifactValidator = assertExternalCorpusArtifact
) {
  return {
    async importArtifact(input: {
      artifact: unknown;
      actorUserId: string;
      now?: Date;
    }): Promise<{ inserted: number; existing: number; progress: BenchmarkReviewProgress }> {
      validateArtifact(input.artifact);
      const artifact = input.artifact;
      const actorUserId = cleanText(input.actorUserId, 100);
      if (!actorUserId) throw new Error("Importing administrator is required");
      const now = input.now ?? new Date();
      const originals = artifact.rows.filter((fixture) => !fixture.isAugmented);
      const result = await repository.upsertFixtures(
        originals.map((fixture) => fixtureDocument({ fixture, artifact, actorUserId, now }))
      );
      const identity = normalizeIdentity({
        datasetId: artifact.dataset.id,
        revision: artifact.dataset.revision!,
      });
      const rows = await repository.listDataset(identity);
      return { ...result, progress: progressFor(rows) };
    },

    async getQueue(input: BenchmarkReviewQueueQuery): Promise<BenchmarkReviewQueue> {
      const identity = normalizeIdentity(input);
      const status = input.status ?? "pending";
      if (!(["all", "pending", "approved", "rejected"] as const).includes(status)) {
        throw new Error("Invalid review status filter");
      }
      const page = Math.max(1, Math.floor(input.page ?? 1));
      const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 20)));
      const query = { ...identity, status, page, limit };
      const [queue, allRows] = await Promise.all([
        repository.listQueue(query),
        repository.listDataset(identity),
      ]);
      return {
        ...queue,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(queue.total / limit)),
        progress: progressFor(allRows),
      };
    },

    async decide(input: {
      id: string;
      expectedVersion: number;
      rights: BenchmarkReviewDecision;
      answer: BenchmarkReviewDecision;
      actorUserId: string;
      note?: string;
      now?: Date;
    }): Promise<BenchmarkReviewFixture> {
      const id = cleanText(input.id, 300);
      const actorUserId = cleanText(input.actorUserId, 100);
      if (!id || !actorUserId) throw new Error("Review id and administrator are required");
      if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
        throw new Error("Expected review version must be a non-negative integer");
      }
      const decisions = ["pending", "approved", "rejected"] as const;
      if (!decisions.includes(input.rights) || !decisions.includes(input.answer)) {
        throw new Error("Invalid benchmark review decision");
      }
      const note = cleanText(input.note, 500);
      const status = statusFor(input.rights, input.answer);
      const now = input.now ?? new Date();
      const event: BenchmarkReviewDecisionEvent = {
        id: randomUUID(),
        actorUserId,
        rights: input.rights,
        answer: input.answer,
        status,
        note,
        createdAt: now,
      };
      const updated = await repository.recordDecision({
        id,
        expectedVersion: input.expectedVersion,
        rights: input.rights,
        answer: input.answer,
        status,
        reviewerId: actorUserId,
        note,
        event,
        updatedAt: now,
      });
      if (!updated) throw new BenchmarkReviewConflictError();
      return updated;
    },

    async exportReviews(
      identityInput: BenchmarkDatasetIdentity
    ): Promise<ExternalPuzzleReviewFile> {
      const identity = normalizeIdentity(identityInput);
      const rows = await repository.listDataset(identity);
      if (!rows.length) throw new Error("Benchmark review dataset has not been imported");
      return {
        schemaVersion: 1,
        datasetId: identity.datasetId,
        revision: identity.revision,
        reviews: Object.fromEntries(
          rows.map((row) => [
            row.fixtureId,
            {
              rights: row.rightsDecision,
              answer: row.answerDecision,
              reviewer: row.reviewerId,
              reviewedAt: row.reviewedAt?.toISOString(),
              note: row.reviewNote,
            },
          ])
        ),
      };
    },
  };
}
