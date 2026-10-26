import type { PuzzleAttempt } from "@/db/models";
import { buildGuessReaction } from "./reactions";

const validScore = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;

/** Only restore submitted tokens and known server-authored reaction copy. */
export function restoreFeedback(row: PuzzleAttempt, maxAttempts: number) {
  const result: Pick<PuzzleAttempt, "similarity" | "reaction" | "wordResults"> = {};
  if (validScore(row.similarity)) {
    result.similarity = row.similarity;
    const input = {
      correct: row.isCorrect,
      similarity: row.similarity,
      attemptsLeft:
        row.isFinal || row.isCorrect || row.abandoned
          ? 0
          : Math.max(0, maxAttempts - (row.attemptNumber ?? 1)),
      guess: row.attemptedAnswer,
    };
    // Both variants are deterministic. Never echo arbitrary legacy text.
    for (const consecutiveCold of [0, 1]) {
      const candidate = buildGuessReaction({ ...input, consecutiveCold });
      if (row.reaction?.tier === candidate.tier && row.reaction?.line === candidate.line) {
        result.reaction = candidate;
      }
    }
  }
  const words = row.attemptedAnswer.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (
    Array.isArray(row.wordResults) &&
    row.wordResults.length === words.length &&
    row.wordResults.every(
      (word, index) =>
        word &&
        word.word === words[index] &&
        typeof word.correct === "boolean" &&
        validScore(word.similarity)
    )
  ) {
    result.wordResults = row.wordResults.map(({ word, correct, similarity }) => ({
      word,
      correct,
      similarity,
    }));
  }
  return result;
}
