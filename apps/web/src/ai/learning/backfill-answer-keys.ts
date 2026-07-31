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

    for (const doc of docs) {
      scanned += 1;
      const key = normalizeAnswerKey(String(doc.answer ?? ""));
      if (!key) {
        skipped += 1;
        continue;
      }
      const result = await getCollection("puzzles").updateOne(
        { id: doc.id },
        { $set: { "metadata.answerKey": key } }
      );
      if (result.modifiedCount > 0) updated += 1;
      else skipped += 1;
    }

    logger.info("Backfilled answer keys", { scanned, updated, skipped });
  } catch (error) {
    logger.warn("Answer key backfill failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { scanned, updated, skipped };
}
