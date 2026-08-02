import "server-only";
import { createMongoPuzzlePlaytestRepository } from "./mongo-puzzle-playtest-repository";
import { createPuzzlePlaytestService } from "./puzzle-playtest-service";

export const puzzlePlaytestService = createPuzzlePlaytestService(
  createMongoPuzzlePlaytestRepository()
);
