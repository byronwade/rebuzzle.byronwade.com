import type { Puzzle, PuzzlePlaytestCandidate } from "@/db/models";
import { getCollection } from "@/db/mongodb";
import type { PuzzlePlaytestBackfillSource } from "./puzzle-playtest-backfill";

export function createMongoPuzzlePlaytestBackfillSource(): PuzzlePlaytestBackfillSource {
  return {
    async listRecentPuzzles(scanLimit) {
      return getCollection<Puzzle>("puzzles")
        .find({
          "metadata.aiGenerated": true,
          puzzleType: "rebus",
          visual: { $exists: true },
        })
        .sort({ publishedAt: -1, createdAt: -1, id: 1 })
        .limit(Math.max(1, Math.min(1000, scanLimit)))
        .toArray();
    },

    async listQueuedPuzzleIds(input) {
      if (!input.puzzleIds.length) return [];
      const rows = await getCollection<PuzzlePlaytestCandidate>("puzzlePlaytestCandidates")
        .find({
          contractVersion: input.contractVersion,
          puzzleId: { $in: input.puzzleIds },
        })
        .project<{ puzzleId: string }>({ puzzleId: 1, _id: 0 })
        .toArray();
      return rows.map((row) => row.puzzleId);
    },
  };
}
