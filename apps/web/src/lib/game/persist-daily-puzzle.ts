/**
 * Persist a daily puzzle with a real UUID so /api/puzzles/guess can resolve it.
 */

import { revalidateTag } from "next/cache";
import { isAnswerRegistered, normalizeAnswerKey } from "@/ai/learning/answer-registry";
import { db } from "@/db";
import type { PuzzleVisual } from "@/db/models";
import { logger } from "@/lib/logger";
import { toLegacyDifficultyLabel } from "./published-puzzle";

export type PersistDailyPuzzleInput = {
  dateString: string;
  puzzleDisplay: string;
  puzzleType: string;
  answer: string;
  difficulty: number;
  category: string;
  explanation: string;
  hints: string[];
  aiGenerated: boolean;
  rebusPuzzle?: string;
  visual?: PuzzleVisual;
  metadataExtra?: Record<string, unknown>;
  /**
   * Emergency play-path seeds only. AI generation must never set this —
   * duplicate answers are a hard uniqueness failure.
   */
  allowDuplicateAnswer?: boolean;
};

/**
 * Upsert-ish: if today's puzzle already exists, return it.
 * Otherwise insert with UTC-midnight publishedAt and a real UUID.
 */
export async function persistDailyPuzzle(input: PersistDailyPuzzleInput): Promise<{
  id: string;
  alreadyExisted: boolean;
}> {
  const existing = await db.puzzleOps.findByDate(input.dateString);
  if (existing) {
    return { id: existing.id, alreadyExisted: true };
  }

  // Never persist a duplicate answer — archive (retired) puzzles still count
  const answerCheck = await isAnswerRegistered(input.answer);
  if (answerCheck.taken && !input.allowDuplicateAnswer) {
    throw new Error(
      `Refusing to persist duplicate answer (matches puzzle ${answerCheck.puzzleId}). Generate a unique answer.`
    );
  }
  if (answerCheck.taken && input.allowDuplicateAnswer) {
    logger.warn("Persisting emergency seed with duplicate answer (allowed)", {
      answerKey: normalizeAnswerKey(input.answer),
      conflictingPuzzleId: answerCheck.puzzleId,
      dateString: input.dateString,
    });
  }

  const id = crypto.randomUUID();
  const publishedAt = new Date(`${input.dateString}T00:00:00.000Z`);
  const answerKey = normalizeAnswerKey(input.answer);

  await db.puzzleOps.create({
    id,
    puzzle: input.puzzleDisplay,
    puzzleType: input.puzzleType,
    answer: input.answer,
    difficulty: toLegacyDifficultyLabel(input.difficulty),
    category: input.category || "general",
    explanation: input.explanation,
    hints: input.hints || [],
    publishedAt,
    createdAt: new Date(),
    active: true,
    visual: input.visual,
    metadata: {
      topic: input.category,
      category: input.category,
      puzzleType: input.puzzleType,
      aiGenerated: input.aiGenerated,
      generatedAt: new Date().toISOString(),
      visualStyleId: input.visual?.styleId,
      // Numeric 1–10 + canonical tier label (easy|medium|hard above is legacy UI mapping)
      difficultyScore: input.difficulty,
      // Permanent uniqueness key (survives soft-retire / archive)
      answerKey,
      archived: false,
      // Intentionally omit keyword (= answer) from metadata
      ...input.metadataExtra,
    },
    rebusPuzzle:
      input.rebusPuzzle ?? (input.puzzleType === "rebus" ? input.puzzleDisplay : undefined),
  });

  revalidateTag("daily-puzzle", "max");
  revalidateTag(`daily-puzzle-${input.dateString}`, "max");

  logger.info("Persisted daily puzzle", {
    puzzleId: id,
    dateString: input.dateString,
    aiGenerated: input.aiGenerated,
  });

  return { id, alreadyExisted: false };
}
