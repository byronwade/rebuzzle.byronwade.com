/**
 * Persist a daily puzzle with a real UUID so /api/puzzles/guess can resolve it.
 */

import { revalidateTag } from "next/cache";
import { isAnswerRegistered, normalizeAnswerKey } from "@/ai/learning/answer-registry";
import { puzzlePlaytestService } from "@/ai/puzzle-agent/review/puzzle-playtest-server";
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
  if (answerCheck.taken) {
    throw new Error(
      `Refusing to persist duplicate answer (matches puzzle ${answerCheck.puzzleId}). Generate a unique answer.`
    );
  }

  const id = crypto.randomUUID();
  const publishedAt = new Date(`${input.dateString}T00:00:00.000Z`);
  const answerKey = normalizeAnswerKey(input.answer);

  try {
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
        // Optional quality evidence cannot override publication identity fields below.
        ...input.metadataExtra,
        // Permanent uniqueness key (survives soft-retire / archive)
        answerKey,
        uniquenessContract: "archive-v1",
        dailyPublicationKey: input.dateString,
        archived: false,
        // Intentionally omit keyword (= answer) from metadata
      },
      rebusPuzzle:
        input.rebusPuzzle ?? (input.puzzleType === "rebus" ? input.puzzleDisplay : undefined),
    });
  } catch (error) {
    const duplicateKey =
      error && typeof error === "object" && "code" in error && error.code === 11_000;
    if (duplicateKey) {
      const concurrent = await db.puzzleOps.findByDate(input.dateString);
      if (concurrent) return { id: concurrent.id, alreadyExisted: true };
      throw new Error("Concurrent publication used this answer before insertion completed", {
        cause: error,
      });
    }
    throw error;
  }

  if (input.aiGenerated && input.puzzleType === "rebus" && input.visual) {
    try {
      const metadata = input.metadataExtra ?? {};
      await puzzlePlaytestService.submitCandidate({
        puzzleId: id,
        answer: input.answer,
        visual: input.visual,
        difficultyScore: input.difficulty,
        techniqueId: typeof metadata.techniqueId === "string" ? metadata.techniqueId : undefined,
        difficultyLevel:
          typeof metadata.difficultyLevel === "string" ? metadata.difficultyLevel : undefined,
        generationMethod:
          typeof metadata.generationMethod === "string" ? metadata.generationMethod : undefined,
        automatedEstimatedSolveRate:
          typeof metadata.estimatedSolveRate === "number" ? metadata.estimatedSolveRate : undefined,
      });
    } catch (error) {
      logger.warn("Failed to queue generated puzzle for blind human playtesting", {
        puzzleId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  revalidateTag("daily-puzzle", "max");
  revalidateTag(`daily-puzzle-${input.dateString}`, "max");

  logger.info("Persisted daily puzzle", {
    puzzleId: id,
    dateString: input.dateString,
    aiGenerated: input.aiGenerated,
  });

  return { id, alreadyExisted: false };
}
