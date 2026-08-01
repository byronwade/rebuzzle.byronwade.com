/**
 * Anti-clone checks — embedding similarity when available, else lexical near-dupe.
 */

import { generatePuzzleEmbedding, isEmbeddingAvailable } from "../../services/embeddings";
import { calculateSimilarity } from "../../services/uniqueness-tracker";
import { getCollection } from "@/db/mongodb";
import { normalizeAnswerKey } from "../quality";

export type AntiCloneResult = {
  ok: boolean;
  score: number;
  method: "embedding" | "lexical" | "skipped";
  nearestAnswer?: string;
  problems: string[];
};

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Compare candidate against recent puzzles; reject near-clones.
 */
export async function checkAntiClone(input: {
  rebusPuzzle: string;
  answer: string;
  explanation?: string;
  category?: string;
  techniqueId?: string;
  lookback?: number;
  /** Cosine / similarity threshold above which we reject (default 0.92) */
  maxSimilarity?: number;
}): Promise<AntiCloneResult> {
  const maxSimilarity = input.maxSimilarity ?? 0.92;
  const lookback = Math.max(20, Math.min(200, input.lookback ?? 80));
  const problems: string[] = [];

  try {
    const recent = (await getCollection("puzzles")
      .find({
        $or: [{ "metadata.lab": { $ne: true } }, { "metadata.lab": { $exists: false } }],
      })
      .project({
        answer: 1,
        rebusPuzzle: 1,
        puzzle: 1,
        explanation: 1,
        category: 1,
        "metadata.techniqueId": 1,
        "metadata.embedding": 1,
      })
      .sort({ createdAt: -1 })
      .limit(lookback)
      .toArray()) as Array<{
      answer?: string;
      rebusPuzzle?: string;
      puzzle?: string;
      explanation?: string;
      category?: string;
      metadata?: { techniqueId?: string; embedding?: number[] };
    }>;

    if (!recent.length) {
      return { ok: true, score: 0, method: "skipped", problems: [] };
    }

    // Fast lexical path always
    let bestLexical = 0;
    let nearestAnswer: string | undefined;
    for (const row of recent) {
      const sim = calculateSimilarity(
        { rebusPuzzle: input.rebusPuzzle, answer: input.answer },
        {
          rebusPuzzle: row.rebusPuzzle || row.puzzle,
          answer: row.answer || "",
        }
      );
      if (sim > bestLexical) {
        bestLexical = sim;
        nearestAnswer = row.answer;
      }
    }

    if (bestLexical >= maxSimilarity) {
      problems.push(
        `Near-duplicate of recent answer "${nearestAnswer}" (lexical ${bestLexical.toFixed(2)})`
      );
      return {
        ok: false,
        score: bestLexical,
        method: "lexical",
        nearestAnswer,
        problems,
      };
    }

    // Same normalized answer is always a clone
    const answerKey = normalizeAnswerKey(input.answer);
    if (recent.some((r) => normalizeAnswerKey(r.answer || "") === answerKey)) {
      problems.push(`Answer already used recently: ${input.answer}`);
      return {
        ok: false,
        score: 1,
        method: "lexical",
        nearestAnswer: input.answer,
        problems,
      };
    }

    if (!isEmbeddingAvailable()) {
      return {
        ok: true,
        score: bestLexical,
        method: "lexical",
        nearestAnswer,
        problems: [],
      };
    }

    // Embedding path against stored vectors when present
    let candidateVec: number[] | null = null;
    try {
      candidateVec = await generatePuzzleEmbedding({
        puzzle: input.rebusPuzzle,
        answer: input.answer,
        category: input.category,
        explanation: input.explanation,
      });
    } catch {
      return {
        ok: true,
        score: bestLexical,
        method: "lexical",
        nearestAnswer,
        problems: [],
      };
    }

    let bestEmbed = 0;
    for (const row of recent) {
      const stored = row.metadata?.embedding;
      if (!Array.isArray(stored) || stored.length !== candidateVec.length) continue;
      const sim = cosineSimilarity(candidateVec, stored);
      if (sim > bestEmbed) {
        bestEmbed = sim;
        nearestAnswer = row.answer;
      }
    }

    if (bestEmbed >= maxSimilarity) {
      problems.push(
        `Semantically too close to "${nearestAnswer}" (embedding ${bestEmbed.toFixed(2)})`
      );
      return {
        ok: false,
        score: bestEmbed,
        method: "embedding",
        nearestAnswer,
        problems,
      };
    }

    return {
      ok: true,
      score: Math.max(bestLexical, bestEmbed),
      method: bestEmbed > 0 ? "embedding" : "lexical",
      nearestAnswer,
      problems: [],
    };
  } catch {
    return { ok: true, score: 0, method: "skipped", problems: [] };
  }
}
