import { getCollection } from "@/db/mongodb";
import { createMongoPuzzleNoveltyArchive } from "./mongo-novelty-archive";
import { normalizeAnswerKey } from "./quality";
import { type SelectedReservePuzzle, selectReservePuzzle } from "./reserve-puzzles";

/** Load the complete answer archive and one structural lookback snapshot, then select once. */
export async function selectMongoReservePuzzle(input: {
  dateString: string;
  now?: Date;
}): Promise<SelectedReservePuzzle> {
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

  return selectReservePuzzle({
    dateString: input.dateString,
    usedAnswerKeys,
    recentPuzzles,
    now: () => now,
  });
}
