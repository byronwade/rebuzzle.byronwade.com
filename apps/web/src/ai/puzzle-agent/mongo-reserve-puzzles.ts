import { getCollection } from "@/db/mongodb";
import { createMongoPuzzleNoveltyArchive } from "./mongo-novelty-archive";
import type { PuzzleNoveltyArchiveEntry } from "./novelty";
import { normalizeAnswerKey } from "./quality";
import { type SelectedReservePuzzle, selectReservePuzzle } from "./reserve-puzzles";

export type MongoReserveArchive = {
  now: Date;
  usedAnswerKeys: ReadonlySet<string>;
  recentPuzzles: readonly PuzzleNoveltyArchiveEntry[];
};

/** Load the complete answer archive and one structural lookback snapshot. */
export async function loadMongoReserveArchive(
  input: { now?: Date } = {}
): Promise<MongoReserveArchive> {
  const now = input.now ?? new Date();
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - 90);

  const [answerDocuments, recentPuzzles] = await Promise.all([
    getCollection("puzzles").find({}).project({ answer: 1, "metadata.answerKey": 1 }).toArray(),
    createMongoPuzzleNoveltyArchive().listRecent(since, 500),
  ]);
  const usedAnswerKeys = new Set<string>();
  for (const document of answerDocuments) {
    const metadata =
      document.metadata && typeof document.metadata === "object"
        ? (document.metadata as { answerKey?: unknown })
        : undefined;
    const key =
      typeof metadata?.answerKey === "string"
        ? metadata.answerKey
        : normalizeAnswerKey(String(document.answer ?? ""));
    if (key) usedAnswerKeys.add(key);
  }
  return { now, usedAnswerKeys, recentPuzzles };
}

/**
 * Select once against the archive. Pass a preloaded `archive` to reuse one snapshot
 * across retries (for example, when a reserve's board fails to compile).
 */
export async function selectMongoReservePuzzle(input: {
  dateString: string;
  now?: Date;
  excludeIds?: ReadonlySet<string>;
  archive?: Promise<MongoReserveArchive> | MongoReserveArchive;
}): Promise<SelectedReservePuzzle> {
  const archive = await (input.archive ?? loadMongoReserveArchive({ now: input.now }));
  return selectReservePuzzle({
    dateString: input.dateString,
    usedAnswerKeys: archive.usedAnswerKeys,
    recentPuzzles: archive.recentPuzzles,
    now: () => archive.now,
    excludeIds: input.excludeIds,
  });
}
