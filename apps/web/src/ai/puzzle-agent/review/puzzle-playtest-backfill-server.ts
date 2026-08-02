import "server-only";
import { createMongoPuzzlePlaytestBackfillSource } from "./mongo-puzzle-playtest-backfill-source";
import { createPuzzlePlaytestBackfillService } from "./puzzle-playtest-backfill";
import { puzzlePlaytestService } from "./puzzle-playtest-server";

export const puzzlePlaytestBackfillService = createPuzzlePlaytestBackfillService(
  createMongoPuzzlePlaytestBackfillSource(),
  (input) => puzzlePlaytestService.submitCandidate(input)
);
