/**
 * Mine common wrong guesses from live play to steer critique / invent.
 */

import { getCollection } from "@/db/mongodb";
import type { PuzzleAttempt } from "@/db/models";
import { normalizeAnswerKey } from "../quality";

export type WrongGuessInsight = {
  guess: string;
  count: number;
  /** Optional technique of the puzzle that attracted this misread */
  techniqueId?: string;
};

export type WrongGuessDigest = {
  topGuesses: WrongGuessInsight[];
  promptBlock: string;
  sampleSize: number;
};

/**
 * Aggregate incorrect attempts from recent puzzles.
 */
export async function loadWrongGuessDigest(input?: {
  lookbackDays?: number;
  limit?: number;
}): Promise<WrongGuessDigest> {
  const lookbackDays = Math.max(1, Math.min(60, input?.lookbackDays ?? 14));
  const limit = Math.max(3, Math.min(20, input?.limit ?? 12));
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  try {
    const collection = getCollection<PuzzleAttempt>("puzzleAttempts");
    const rows = await collection
      .find({
        isCorrect: false,
        attemptedAt: { $gte: since },
        attemptedAnswer: { $exists: true, $nin: [null, ""] },
      })
      .project({ attemptedAnswer: 1, difficultyLevel: 1 })
      .limit(2000)
      .toArray();

    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = normalizeAnswerKey(row.attemptedAnswer || "");
      if (!key || key.length < 2 || key.length > 48) continue;
      // Skip obvious noise
      if (/^(test|asdf|xxx|idk|nope)$/i.test(key)) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const topGuesses = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([guess, count]) => ({ guess, count }));

    const promptBlock = topGuesses.length
      ? [
          "Live wrong-guess patterns players already make (design against these traps):",
          ...topGuesses.map((g) => `  - "${g.guess}" (×${g.count})`),
          "Ensure the board's intended reading beats these alternatives once hints unlock the device.",
        ].join("\n")
      : "No strong wrong-guess corpus yet — invent clear false leads that hints can dismantle.";

    return {
      topGuesses,
      promptBlock,
      sampleSize: rows.length,
    };
  } catch {
    return {
      topGuesses: [],
      promptBlock:
        "Wrong-guess mining unavailable — still invent one clear false lead and fair hints.",
      sampleSize: 0,
    };
  }
}
