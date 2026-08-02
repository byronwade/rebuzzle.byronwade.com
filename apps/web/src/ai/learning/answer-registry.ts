/**
 * Answer registry — uniqueness across ALL puzzles (active + retired archive).
 */

import { getCollection } from "@/db/mongodb";
import { normalizeAnswerKey } from "../puzzle-agent/quality";

export { normalizeAnswerKey };

/**
 * True if this answer (normalized) already exists in the catalog — including retired puzzles.
 */
export async function isAnswerRegistered(answer: string): Promise<{
  taken: boolean;
  puzzleId?: string;
  active?: boolean;
}> {
  const key = normalizeAnswerKey(answer);
  if (!key || key.length < 2) return { taken: false };

  try {
    const hit = await getCollection("puzzles")
      .find({
        $or: [
          { "metadata.answerKey": key },
          // Legacy rows without answerKey — approximate via lowercase answer
          { answer: { $regex: new RegExp(`^${escapeRegex(answer.trim())}$`, "i") } },
        ],
      })
      .project({ id: 1, active: 1, answer: 1, metadata: 1 })
      .limit(20)
      .toArray();

    for (const doc of hit) {
      const docKey =
        typeof doc.metadata === "object" &&
        doc.metadata &&
        "answerKey" in doc.metadata &&
        typeof (doc.metadata as { answerKey?: string }).answerKey === "string"
          ? (doc.metadata as { answerKey: string }).answerKey
          : normalizeAnswerKey(String(doc.answer ?? ""));
      if (docKey === key) {
        return {
          taken: true,
          puzzleId: String(doc.id),
          active: Boolean(doc.active),
        };
      }
    }
    return { taken: false };
  } catch (error) {
    throw new Error("Cannot verify archive-wide answer uniqueness", { cause: error });
  }
}

/**
 * Load banned answer keys from the full archive (not just recent active).
 */
export async function loadAllAnswerKeys(limit = 500): Promise<string[]> {
  try {
    const docs = await getCollection("puzzles")
      .find({})
      .project({ answer: 1, metadata: 1 })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const keys = new Set<string>();
    for (const doc of docs) {
      const fromMeta =
        typeof doc.metadata === "object" &&
        doc.metadata &&
        "answerKey" in doc.metadata &&
        typeof (doc.metadata as { answerKey?: string }).answerKey === "string"
          ? (doc.metadata as { answerKey: string }).answerKey
          : null;
      const key = fromMeta || normalizeAnswerKey(String(doc.answer ?? ""));
      if (key) keys.add(key);
    }
    return [...keys];
  } catch {
    return [];
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
