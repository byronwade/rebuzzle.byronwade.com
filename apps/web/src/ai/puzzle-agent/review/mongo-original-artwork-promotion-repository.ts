import { getCollection } from "@/db/mongodb";
import type {
  OriginalArtworkPromotion,
  OriginalArtworkPromotionRepository,
} from "./original-artwork-promotion";

/** Asset identity is Mongo's built-in unique _id; no separate index rollout is required. */
export function createMongoOriginalArtworkPromotionRepository(): OriginalArtworkPromotionRepository {
  const collection = () => getCollection<OriginalArtworkPromotion>("originalArtworkPromotions");
  return {
    async find(assetId) {
      return collection().findOne({ _id: assetId });
    },
    async save(record, expectedStatusVersion) {
      if (expectedStatusVersion === 0) {
        try {
          await collection().insertOne(record);
          return true;
        } catch (error) {
          if ((error as { code?: number }).code === 11000) return false;
          throw error;
        }
      }
      const result = await collection().replaceOne(
        { _id: record.assetId, statusVersion: expectedStatusVersion },
        record
      );
      return result.matchedCount === 1;
    },
  };
}
