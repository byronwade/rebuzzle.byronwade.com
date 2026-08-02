import "server-only";
import { createIconRecognitionService } from "./icon-recognition-service";
import { createMongoIconRecognitionRepository } from "./mongo-icon-recognition-repository";

export const iconRecognitionService = createIconRecognitionService(
  createMongoIconRecognitionRepository()
);
