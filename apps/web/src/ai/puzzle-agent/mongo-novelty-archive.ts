import { getCollection } from "@/db/mongodb";
import type { PuzzleNoveltyArchive, PuzzleNoveltyArchiveEntry } from "./novelty";
import { PuzzleVisualSchema } from "./visual/composition";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toEntry(document: Record<string, unknown>): PuzzleNoveltyArchiveEntry {
  const metadata =
    document.metadata && typeof document.metadata === "object"
      ? (document.metadata as Record<string, unknown>)
      : {};
  const visual = PuzzleVisualSchema.safeParse(document.visual);
  const createdAt =
    document.createdAt instanceof Date ? document.createdAt : new Date(String(document.createdAt));
  return {
    id: String(document.id ?? "unknown"),
    answer: String(document.answer ?? ""),
    category: String(document.category ?? metadata.category ?? ""),
    techniqueId: typeof metadata.techniqueId === "string" ? metadata.techniqueId : undefined,
    rebusPuzzle: String(document.rebusPuzzle ?? document.puzzle ?? ""),
    visual: visual.success ? visual.data : undefined,
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date(0) : createdAt,
    active: typeof document.active === "boolean" ? document.active : undefined,
  };
}

export function createMongoPuzzleNoveltyArchive(): PuzzleNoveltyArchive {
  return {
    async findExactAnswer(answerKey, rawAnswer) {
      const document = await getCollection("puzzles").findOne({
        $or: [
          { "metadata.answerKey": answerKey },
          { answer: { $regex: new RegExp(`^${escapeRegex(rawAnswer.trim())}$`, "i") } },
        ],
      });
      return document ? toEntry(document as Record<string, unknown>) : null;
    },
    async listRecent(since, limit) {
      const documents = await getCollection("puzzles")
        .find({ createdAt: { $gte: since } })
        .project({
          id: 1,
          answer: 1,
          category: 1,
          puzzle: 1,
          rebusPuzzle: 1,
          visual: 1,
          createdAt: 1,
          active: 1,
          metadata: 1,
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      return documents.map((document) => toEntry(document as Record<string, unknown>));
    },
  };
}
