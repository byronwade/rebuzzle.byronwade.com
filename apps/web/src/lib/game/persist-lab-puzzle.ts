/**
 * Persist a Dev Visual Lab generation as an inactive puzzle for feedback + learning.
 * Never becomes today's daily (active: false).
 */

import { normalizeAnswerKey } from "@/ai/learning/answer-registry";
import { db } from "@/db";
import type { NewPuzzle, PuzzleVisual } from "@/db/models";
import { logger } from "@/lib/logger";
import { toLegacyDifficultyLabel } from "./published-puzzle";

export type PersistLabPuzzleInput = {
  puzzleDisplay: string;
  answer: string;
  difficulty: number;
  difficultyLevel?: string;
  category?: string;
  explanation?: string;
  hints?: string[];
  techniqueId?: string;
  visual?: PuzzleVisual;
  rebusPuzzle?: string;
  labMode: string;
  engine?: string;
  qualityScore?: number;
  funScore?: number;
  fingerprint?: string;
  uniquenessScore?: number;
  createdByUserId?: string;
};

/**
 * Insert an inactive lab puzzle. Returns the new id.
 */
export async function persistLabPuzzle(input: PersistLabPuzzleInput): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  const now = new Date();
  const answerKey = normalizeAnswerKey(input.answer);
  const puzzleDisplay =
    input.puzzleDisplay.trim() ||
    input.visual?.unicodeFallback?.trim() ||
    input.rebusPuzzle?.trim() ||
    "◆";

  const doc: NewPuzzle = {
    id,
    puzzle: puzzleDisplay,
    puzzleType: "rebus",
    answer: input.answer,
    difficulty: toLegacyDifficultyLabel(input.difficulty),
    category: input.category || "dev_lab",
    explanation: input.explanation || "",
    hints: input.hints || [],
    publishedAt: now,
    createdAt: now,
    active: false,
    visual: input.visual,
    rebusPuzzle: input.rebusPuzzle ?? puzzleDisplay,
    metadata: {
      topic: input.category || "dev_lab",
      category: input.category || "dev_lab",
      puzzleType: "rebus",
      aiGenerated: true,
      generatedAt: now.toISOString(),
      lab: true,
      source: "dev_lab",
      labMode: input.labMode,
      generationMethod: "dev-lab",
      engine: input.engine,
      techniqueId: input.techniqueId,
      visualStyleId: input.visual?.styleId,
      difficultyScore: input.difficulty,
      difficultyLevel: input.difficultyLevel,
      answerKey,
      qualityScore: input.qualityScore,
      funScore: input.funScore,
      fingerprint: input.fingerprint,
      uniquenessScore: input.uniquenessScore,
      archived: true,
      retiredReason: "dev_lab_preview",
      createdByUserId: input.createdByUserId,
    },
  };

  await db.puzzleOps.create(doc);

  logger.info("Persisted Dev Lab puzzle", {
    puzzleId: id,
    labMode: input.labMode,
    answerKey,
  });

  return { id };
}
