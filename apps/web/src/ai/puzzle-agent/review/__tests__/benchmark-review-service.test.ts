import type { BenchmarkReviewFixture } from "../../../../db/models";
import {
  computeExternalFixtureSha256,
  type ExternalCorpusArtifact,
  type ExternalPuzzleFixture,
  getExternalDatasetManifest,
  scoreExternalCorpusReadiness,
} from "../../benchmark/external-corpus";
import {
  type BenchmarkReviewArtifactValidator,
  BenchmarkReviewConflictError,
  type BenchmarkReviewRepository,
  createBenchmarkReviewService,
} from "../benchmark-review-service";

const FEATURES = [
  "spelling",
  "color",
  "position",
  "orientation",
  "aspect_ratio",
  "size",
  "style_texture",
  "number",
] as const;

function artifact(): ExternalCorpusArtifact {
  const manifest = getExternalDatasetManifest("re-bus-hf-v1");
  const rows: ExternalPuzzleFixture[] = Array.from({ length: 101 }, (_, index) => ({
    id: `re-bus-hf-v1:fixture-${index}`,
    datasetId: manifest.id,
    datasetRow: index + 2,
    imageUrl: `https://raw.githubusercontent.com/abhi1nandy2/Re-Bus/master/images/${index}.png`,
    sourceUrl: `https://${index % 2 ? "eslvault.com" : "kids.niehs.nih.gov"}/puzzle`,
    answer: `answer ${index}`,
    difficulty: index % 2 ? "EASY" : "HARD",
    reasoningFeatures: [...FEATURES],
    isAugmented: index === 100,
    reviewStatus: "pending",
    eligibleForEvaluation: false,
  }));
  return {
    schemaVersion: 2,
    importedAt: "2026-08-01T00:00:00.000Z",
    dataset: manifest,
    metadataSha256: manifest.metadataSha256!,
    fixtureSha256: computeExternalFixtureSha256(rows),
    rows,
    invalidRows: [],
    summary: scoreExternalCorpusReadiness({ manifest, rows, invalidRows: 0 }),
  };
}

function inMemoryRepository(): BenchmarkReviewRepository {
  const records = new Map<string, BenchmarkReviewFixture>();
  return {
    async upsertFixtures(fixtures) {
      let inserted = 0;
      for (const fixture of fixtures) {
        if (records.has(fixture.id)) continue;
        records.set(fixture.id, structuredClone(fixture));
        inserted += 1;
      }
      return { inserted, existing: fixtures.length - inserted };
    },
    async listQueue(input) {
      const selected = [...records.values()].filter(
        (row) =>
          row.datasetId === input.datasetId &&
          row.revision === input.revision &&
          (input.status === "all" || row.reviewStatus === input.status)
      );
      return {
        items: selected.slice((input.page - 1) * input.limit, input.page * input.limit),
        total: selected.length,
      };
    },
    async listDataset(identity) {
      return [...records.values()].filter(
        (row) => row.datasetId === identity.datasetId && row.revision === identity.revision
      );
    },
    async recordDecision(input) {
      const current = records.get(input.id);
      if (!current || current.version !== input.expectedVersion) return null;
      const updated: BenchmarkReviewFixture = {
        ...current,
        rightsDecision: input.rights,
        answerDecision: input.answer,
        reviewStatus: input.status,
        reviewerId: input.reviewerId,
        reviewedAt: input.updatedAt,
        reviewNote: input.note,
        updatedAt: input.updatedAt,
        version: current.version + 1,
        decisionHistory: [...current.decisionHistory, input.event],
      };
      records.set(input.id, updated);
      return structuredClone(updated);
    },
  };
}

function testService() {
  const expectedFixtureSha = artifact().fixtureSha256;
  const validateArtifact: BenchmarkReviewArtifactValidator = (
    value: unknown
  ): asserts value is ExternalCorpusArtifact => {
    if (!value || typeof value !== "object") throw new Error("Invalid test artifact");
    const candidate = value as ExternalCorpusArtifact;
    if (computeExternalFixtureSha256(candidate.rows) !== candidate.fixtureSha256) {
      throw new Error("External corpus fixture digest does not match its immutable metadata");
    }
    if (candidate.fixtureSha256 !== expectedFixtureSha) {
      throw new Error("External corpus does not match the approved pinned fixture set");
    }
  };
  return createBenchmarkReviewService(inMemoryRepository(), validateArtifact);
}

describe("benchmark review module", () => {
  it("imports only original fixtures and preserves existing decisions on re-import", async () => {
    const service = testService();
    const first = await service.importArtifact({ artifact: artifact(), actorUserId: "admin-1" });
    expect(first.inserted).toBe(100);
    expect(first.progress.total).toBe(100);
    expect(first.progress.pending).toBe(100);

    const queue = await service.getQueue({
      datasetId: "re-bus-hf-v1",
      revision: getExternalDatasetManifest("re-bus-hf-v1").revision!,
      limit: 1,
    });
    await service.decide({
      id: queue.items[0]!.id,
      expectedVersion: 0,
      rights: "approved",
      answer: "approved",
      actorUserId: "admin-1",
      now: new Date("2026-08-01T12:00:00.000Z"),
    });
    const second = await service.importArtifact({ artifact: artifact(), actorUserId: "admin-2" });
    expect(second.inserted).toBe(0);
    expect(second.existing).toBe(100);
    expect(second.progress.approved).toBe(1);
  });

  it("records append-only decisions and rejects stale reviewer writes", async () => {
    const service = testService();
    const imported = artifact();
    await service.importArtifact({ artifact: imported, actorUserId: "admin-1" });
    const queue = await service.getQueue({
      datasetId: imported.dataset.id,
      revision: imported.dataset.revision!,
      limit: 1,
    });
    const item = queue.items[0]!;
    const approved = await service.decide({
      id: item.id,
      expectedVersion: item.version,
      rights: "approved",
      answer: "approved",
      actorUserId: "admin-1",
      note: "Source and answer checked",
      now: new Date("2026-08-01T12:00:00.000Z"),
    });
    expect(approved.version).toBe(1);
    expect(approved.decisionHistory).toHaveLength(1);
    expect(approved.reviewStatus).toBe("approved");
    await expect(
      service.decide({
        id: item.id,
        expectedVersion: 0,
        rights: "rejected",
        answer: "approved",
        actorUserId: "admin-2",
      })
    ).rejects.toBeInstanceOf(BenchmarkReviewConflictError);
  });

  it("exports a review file compatible with the pinned evaluator workflow", async () => {
    const service = testService();
    const imported = artifact();
    await service.importArtifact({ artifact: imported, actorUserId: "admin-1" });
    const queue = await service.getQueue({
      datasetId: imported.dataset.id,
      revision: imported.dataset.revision!,
      limit: 1,
    });
    await service.decide({
      id: queue.items[0]!.id,
      expectedVersion: 0,
      rights: "approved",
      answer: "approved",
      actorUserId: "admin-1",
      now: new Date("2026-08-01T12:00:00.000Z"),
    });
    const exported = await service.exportReviews({
      datasetId: imported.dataset.id,
      revision: imported.dataset.revision!,
    });
    expect(exported.schemaVersion).toBe(1);
    expect(exported.reviews[queue.items[0]!.fixtureId]).toEqual(
      expect.objectContaining({
        rights: "approved",
        answer: "approved",
        reviewer: "admin-1",
        reviewedAt: "2026-08-01T12:00:00.000Z",
      })
    );
  });

  it("rejects fixture metadata tampering before persistence", async () => {
    const service = testService();
    const tampered = artifact();
    tampered.rows[0] = { ...tampered.rows[0]!, answer: "changed answer" };
    tampered.fixtureSha256 = computeExternalFixtureSha256(tampered.rows);
    await expect(
      service.importArtifact({ artifact: tampered, actorUserId: "admin-1" })
    ).rejects.toThrow("approved pinned fixture set");
  });
});
