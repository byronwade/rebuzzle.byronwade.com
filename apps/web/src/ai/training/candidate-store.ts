import { getCollection } from "@/db/mongodb";
import { logger } from "@/lib/logger";
import type { ApexCandidate } from "../puzzle-agent/apex/types";
import { snapshotCandidate } from "./candidate-record";

/** Collection failures must never change which puzzle passes publication gates. */
export async function recordTournamentCandidates(input: {
  runId: string;
  candidates: ApexCandidate[];
  winnerId?: string;
}): Promise<void> {
  try {
    const records = input.candidates.map((candidate) =>
      snapshotCandidate(candidate, input.runId, candidate.id === input.winnerId)
    );
    if (!records.length) return;
    await getCollection<{ _id: string; id: string }>("puzzleTrainingCandidates").bulkWrite(
      records.map((record) => ({
        updateOne: {
          filter: { _id: record.id },
          update: { $setOnInsert: record },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  } catch {
    logger.warn("Puzzle training candidate capture failed", { runId: input.runId });
  }
}
