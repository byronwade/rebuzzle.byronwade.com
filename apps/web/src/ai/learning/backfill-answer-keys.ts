/**
 * Backfill metadata.answerKey for legacy puzzles so archive uniqueness is complete.
 */

import { getCollection } from "@/db/mongodb";
import { logger } from "@/lib/logger";
import { normalizeAnswerKey } from "./answer-registry";

export async function backfillAnswerKeys(input?: {
  limit?: number;
}): Promise<{ scanned: number; updated: number; skipped: number }> {
  const limit = input?.limit ?? 500;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  try {
    const docs = await getCollection("puzzles")
      .find({
        $or: [
          { "metadata.answerKey": { $exists: false } },
          { "metadata.answerKey": null },
          { "metadata.answerKey": "" },
        ],
      })
      .project({ id: 1, answer: 1 })
      .limit(limit)
      .toArray();

    const outcomes = await Promise.all(
      docs.map(async (doc) => {
        const key = normalizeAnswerKey(String(doc.answer ?? ""));
        if (!key) return "skipped" as const;
        const result = await getCollection("puzzles").updateOne(
          { id: doc.id },
          { $set: { "metadata.answerKey": key } }
        );
        return result.modifiedCount > 0 ? ("updated" as const) : ("skipped" as const);
      })
    );
    scanned = docs.length;
    updated = outcomes.filter((o) => o === "updated").length;
    skipped = outcomes.filter((o) => o === "skipped").length;

    logger.info("Backfilled answer keys", { scanned, updated, skipped });
  } catch (error) {
    logger.warn("Answer key backfill failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { scanned, updated, skipped };
}
