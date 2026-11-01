import type { Filter } from "mongodb";
import type { DailyPuzzleCandidate, Puzzle, PuzzleVisual } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import type {
  CanonicalBoardBackfillSource,
  CanonicalBoardBackfillTarget,
} from "./canonical-board-backfill";

/** Queued = not yet published or rejected. Playtest snapshots are immutable and never touched. */
const QUEUED_STATUSES: DailyPuzzleCandidate["status"][] = ["reviewing", "ready", "assigned"];

export function createMongoCanonicalBoardBackfillSource(): CanonicalBoardBackfillSource {
  return {
    async listMissingBoards(limit) {
      const puzzleFilter: Filter<Puzzle> = {
        visual: { $exists: true },
        "visual.mode": { $ne: "unicode" },
        "visual.canonicalBoard": { $exists: false },
      };
      const candidateFilter: Filter<DailyPuzzleCandidate> = {
        status: { $in: QUEUED_STATUSES },
        "payload.visual": { $exists: true },
        "payload.visual.mode": { $ne: "unicode" },
        "payload.visual.canonicalBoard": { $exists: false },
      };
      const [puzzles, candidates] = await Promise.all([
        getCollection<Puzzle>("puzzles")
          .find(puzzleFilter)
          .sort({ publishedAt: -1, id: 1 })
          .limit(limit)
          .project<{ id: string; visual: PuzzleVisual }>({ _id: 0, id: 1, visual: 1 })
          .toArray(),
        getCollection<DailyPuzzleCandidate>("dailyPuzzleCandidates")
          .find(candidateFilter)
          .sort({ createdAt: 1, id: 1 })
          .limit(limit)
          .project<{ id: string; statusVersion: number; payload: { visual: PuzzleVisual } }>({
            _id: 0,
            id: 1,
            statusVersion: 1,
            "payload.visual": 1,
          })
          .toArray(),
      ]);
      return [
        ...puzzles.map(
          (row): CanonicalBoardBackfillTarget => ({
            collection: "puzzles",
            id: row.id,
            visual: row.visual,
          })
        ),
        ...candidates.map(
          (row): CanonicalBoardBackfillTarget => ({
            collection: "dailyPuzzleCandidates",
            id: row.id,
            visual: row.payload.visual,
            expectedStatusVersion: row.statusVersion,
          })
        ),
      ];
    },

    async saveBoard({ collection, id, canonicalBoard, expectedStatusVersion }) {
      if (collection === "puzzles") {
        // Puzzles carry no version field; the missing-board guard is the compare-and-set.
        const filter: Filter<Puzzle> = { id, "visual.canonicalBoard": { $exists: false } };
        const result = await getCollection<Puzzle>("puzzles").updateOne(filter, {
          $set: { "visual.canonicalBoard": canonicalBoard },
        });
        return result.modifiedCount === 1;
      }
      // Candidate writers all compare-and-set on statusVersion; match it and bump it so a
      // concurrent queue recompile or status change neither clobbers nor is clobbered by this.
      if (expectedStatusVersion === undefined) return false;
      const filter: Filter<DailyPuzzleCandidate> = {
        id,
        statusVersion: expectedStatusVersion,
        status: { $in: QUEUED_STATUSES },
        "payload.visual.canonicalBoard": { $exists: false },
      };
      const result = await getCollection<DailyPuzzleCandidate>("dailyPuzzleCandidates").updateOne(
        filter,
        {
          $set: { "payload.visual.canonicalBoard": canonicalBoard, updatedAt: new Date() },
          $inc: { statusVersion: 1 },
        }
      );
      return result.modifiedCount === 1;
    },
  };
}
