import type { Filter } from "mongodb";
import type { GeneratedPictogramCandidate, GeneratedPictogramReview } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import type { GeneratedPictogramRepository } from "./generated-pictogram-registry";

function candidates() {
  return getCollection<GeneratedPictogramCandidate>("generatedPictogramCandidates");
}

function reviews() {
  return getCollection<GeneratedPictogramReview>("generatedPictogramReviews");
}

export function createMongoGeneratedPictogramRepository(): GeneratedPictogramRepository {
  return {
    async findCandidateByAssetSha256(assetSha256) {
      return candidates().findOne({ assetSha256 });
    },

    async findCandidateById(id) {
      return candidates().findOne({ id });
    },

    async findApproved(input) {
      return candidates().findOne({ ...input, status: "approved" });
    },

    async countPendingForConcept(input) {
      return candidates().countDocuments({ ...input, status: "pending" });
    },

    async insertCandidate(candidate) {
      try {
        await candidates().insertOne(candidate);
        return true;
      } catch (error) {
        if ((error as { code?: number }).code === 11000) return false;
        throw error;
      }
    },

    async listCandidates(input) {
      const filter: Filter<GeneratedPictogramCandidate> = {
        registryVersion: input.registryVersion,
        ...(input.statuses?.length ? { status: { $in: input.statuses } } : {}),
      };
      return candidates()
        .find(filter)
        .sort({ createdAt: 1, id: 1 })
        .limit(Math.max(1, Math.min(1000, input.limit ?? 200)))
        .toArray();
    },

    async listReviewerReviews(input) {
      return reviews()
        .find({
          registryVersion: input.registryVersion,
          reviewerId: input.reviewerId,
        })
        .sort({ createdAt: 1 })
        .toArray();
    },

    async listCandidateReviews(input) {
      return reviews()
        .find({
          registryVersion: input.registryVersion,
          candidateId: input.candidateId,
        })
        .sort({ createdAt: 1 })
        .toArray();
    },

    async insertReview(review) {
      try {
        await reviews().insertOne(review);
        return true;
      } catch (error) {
        if ((error as { code?: number }).code === 11000) return false;
        throw error;
      }
    },

    async transitionCandidate(input) {
      return candidates().findOneAndUpdate(
        {
          id: input.id,
          statusVersion: input.expectedStatusVersion,
          status: { $in: input.fromStatuses },
        },
        {
          $set: {
            status: input.status,
            humanEvidence: input.humanEvidence,
            updatedAt: input.updatedAt,
          },
          $inc: { statusVersion: 1 },
          $push: { auditHistory: input.event },
        },
        { returnDocument: "after" }
      );
    },
  };
}
