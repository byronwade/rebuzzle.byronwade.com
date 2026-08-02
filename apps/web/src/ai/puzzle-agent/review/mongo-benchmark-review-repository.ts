import type { Filter } from "mongodb";
import type { BenchmarkReviewFixture } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import type {
  BenchmarkDatasetIdentity,
  BenchmarkReviewQueueQuery,
  BenchmarkReviewRepository,
} from "./benchmark-review-service";

function collection() {
  return getCollection<BenchmarkReviewFixture>("benchmarkReviewFixtures");
}

export function createMongoBenchmarkReviewRepository(): BenchmarkReviewRepository {
  return {
    async upsertFixtures(fixtures) {
      if (!fixtures.length) return { inserted: 0, existing: 0 };
      const result = await collection().bulkWrite(
        fixtures.map((fixture) => ({
          updateOne: {
            filter: { id: fixture.id },
            update: { $setOnInsert: fixture },
            upsert: true,
          },
        })),
        { ordered: false }
      );
      return {
        inserted: result.upsertedCount,
        existing: fixtures.length - result.upsertedCount,
      };
    },

    async listQueue(input: Required<BenchmarkReviewQueueQuery>) {
      const filter: Filter<BenchmarkReviewFixture> = {
        datasetId: input.datasetId,
        revision: input.revision,
        ...(input.status === "all" ? {} : { reviewStatus: input.status }),
      };
      const [items, total] = await Promise.all([
        collection()
          .find(filter)
          .sort({ datasetRow: 1 })
          .skip((input.page - 1) * input.limit)
          .limit(input.limit)
          .toArray(),
        collection().countDocuments(filter),
      ]);
      return { items, total };
    },

    async listDataset(identity: BenchmarkDatasetIdentity) {
      return collection()
        .find({ datasetId: identity.datasetId, revision: identity.revision })
        .sort({ datasetRow: 1 })
        .toArray();
    },

    async recordDecision(input) {
      return collection().findOneAndUpdate(
        { id: input.id, version: input.expectedVersion },
        {
          $set: {
            rightsDecision: input.rights,
            answerDecision: input.answer,
            reviewStatus: input.status,
            reviewerId: input.reviewerId,
            reviewedAt: input.updatedAt,
            reviewNote: input.note,
            updatedAt: input.updatedAt,
          },
          $inc: { version: 1 },
          $push: { decisionHistory: input.event },
        },
        { returnDocument: "after" }
      );
    },
  };
}
