/**
 * Contract for a puzzle after generation gates pass and before/after persist.
 * Keeps play UI, cron, and Eve output aligned on one shape.
 */

import type { PuzzleVisual } from "@/db/models";

export type CanonicalDifficultyLevel = "Hard" | "Difficult" | "Evil" | "Impossible";

export type PublishedPuzzlePayload = {
  rebusPuzzle: string;
  answer: string;
  /** Numeric 1–10 inside a canonical band */
  difficulty: number;
  difficultyLevel: CanonicalDifficultyLevel;
  explanation: string;
  category: string;
  hints: string[];
  techniqueId: string;
  visual: PuzzleVisual;
  fingerprint: string;
  uniquenessScore: number;
  qualityScore: number;
  funScore?: number;
};

/** Map numeric difficulty to legacy easy|medium|hard for older UI fields. */
export function toLegacyDifficultyLabel(difficulty: number): "easy" | "medium" | "hard" {
  if (difficulty <= 3) return "easy";
  if (difficulty <= 7) return "medium";
  return "hard";
}
