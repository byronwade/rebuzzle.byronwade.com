/**
 * Guarantee a playable puzzle exists for a UTC date.
 * Seeds a deterministic fallback when the day is empty; never leaves the board blank.
 */

import { getCollection } from "@/db/mongodb";
import type { Puzzle } from "@/db/models";
import { db } from "@/db";
import { logger } from "@/lib/logger";
import {
  isUpgradeableSeedPuzzle,
  pickFallbackPuzzle,
} from "./fallback-puzzles";
import { persistDailyPuzzle } from "./persist-daily-puzzle";

export async function puzzleHasFinalAttempts(puzzleId: string): Promise<boolean> {
  try {
    const hit = await getCollection("puzzleAttempts").findOne(
      { puzzleId, isFinal: true },
      { projection: { _id: 1 } }
    );
    return Boolean(hit);
  } catch {
    return true; // fail closed — don't upgrade if we can't check
  }
}

/**
 * Persist a deterministic seed if no active puzzle exists for the date.
 * Idempotent: returns the existing puzzle when already present.
 */
export async function ensureDailyPuzzleSeeded(dateString: string): Promise<{
  id: string;
  seeded: boolean;
  alreadyExisted: boolean;
}> {
  const existing = await db.puzzleOps.findByDate(dateString);
  if (existing) {
    return { id: existing.id, seeded: false, alreadyExisted: true };
  }

  const fallback = pickFallbackPuzzle(dateString);
  logger.warn("Seeding guaranteed daily puzzle (empty day)", { dateString });

  const persisted = await persistDailyPuzzle({
    dateString,
    puzzleDisplay: fallback.rebusPuzzle,
    puzzleType: "rebus",
    answer: fallback.answer,
    difficulty: fallback.difficulty,
    category: fallback.category,
    explanation: fallback.explanation,
    hints: fallback.hints,
    aiGenerated: false,
    rebusPuzzle: fallback.rebusPuzzle,
    allowDuplicateAnswer: true,
    metadataExtra: {
      fallbackReason: "Daily guarantee seed (empty day)",
      seedKind: "daily_guarantee",
    },
  });

  return {
    id: persisted.id,
    seeded: !persisted.alreadyExisted,
    alreadyExisted: persisted.alreadyExisted,
  };
}

/**
 * Cron/AI path: seed may be replaced only if nobody has finished today's board.
 */
export async function canUpgradeTodaysSeed(dateString: string): Promise<{
  canUpgrade: boolean;
  puzzle: Puzzle | null;
  reason: string;
}> {
  const puzzle = await db.puzzleOps.findByDate(dateString);
  if (!puzzle) {
    return { canUpgrade: true, puzzle: null, reason: "no_puzzle" };
  }
  if (!isUpgradeableSeedPuzzle(puzzle)) {
    return { canUpgrade: false, puzzle, reason: "not_a_seed" };
  }
  const played = await puzzleHasFinalAttempts(puzzle.id);
  if (played) {
    return { canUpgrade: false, puzzle, reason: "already_played" };
  }
  return { canUpgrade: true, puzzle, reason: "upgradeable_seed" };
}
