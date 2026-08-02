import type { IconRecognitionReview } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import type { IconRecognitionRepository } from "./icon-recognition-service";

function collection() {
  return getCollection<IconRecognitionReview>("iconRecognitionReviews");
}

export function createMongoIconRecognitionRepository(): IconRecognitionRepository {
  return {
    async listReviewerDecisions(input) {
      return collection()
        .find({
          reviewerId: input.reviewerId,
          contractVersion: input.contractVersion,
          catalogVersion: input.catalogVersion,
        })
        .sort({ createdAt: 1 })
        .toArray();
    },

    async listCalibrationDecisions(input) {
      return collection()
        .find({
          contractVersion: input.contractVersion,
          catalogVersion: input.catalogVersion,
        })
        .sort({ createdAt: 1 })
        .toArray();
    },

    async insertDecision(review) {
      try {
        await collection().insertOne(review);
        return true;
      } catch (error) {
        if ((error as { code?: number }).code === 11000) return false;
        throw error;
      }
    },
  };
}
