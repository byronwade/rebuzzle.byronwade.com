import "server-only";
import { scoreIconRecognitionCalibration } from "./icon-recognition-service";
import { createMongoIconRecognitionRepository } from "./mongo-icon-recognition-repository";
import { createMongoOriginalArtworkPromotionRepository } from "./mongo-original-artwork-promotion-repository";
import { createOriginalArtworkPromotionService } from "./original-artwork-promotion";

const recognition = createMongoIconRecognitionRepository();
export const originalArtworkPromotionService = createOriginalArtworkPromotionService(
  createMongoOriginalArtworkPromotionRepository(),
  async () => {
    const policy = scoreIconRecognitionCalibration({ panelId: "originals", reviews: [] });
    const reviews = await recognition.listCalibrationDecisions({
      contractVersion: policy.contractVersion,
      catalogVersion: policy.catalogVersion,
    });
    return scoreIconRecognitionCalibration({ panelId: "originals", reviews });
  }
);
