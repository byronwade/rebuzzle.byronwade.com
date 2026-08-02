import "server-only";
import { createBenchmarkReviewService } from "./benchmark-review-service";
import { createMongoBenchmarkReviewRepository } from "./mongo-benchmark-review-repository";

export const benchmarkReviewService = createBenchmarkReviewService(
  createMongoBenchmarkReviewRepository()
);
