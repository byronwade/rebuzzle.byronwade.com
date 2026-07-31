/**
 * Shared puzzle-agent tool implementations.
 * Used by both the Eve agent (`agent/tools/*`) and the in-process ToolLoopAgent.
 */

import { createHash } from "node:crypto";
import { getCollection } from "@/db/mongodb";
import { getPuzzleTypeConfig, listPuzzleTypes } from "../config/puzzle-types";
import { calibrateDifficulty } from "../services/difficulty-calibrator";
import {
  calculateUniquenessScore,
  createPuzzleFingerprint,
  validateUniqueness,
} from "../services/uniqueness-tracker";
import type { CandidatePuzzle } from "./schemas";

function resolvePrompt(
  value: string | ((params: Record<string, unknown>) => string) | undefined,
  params: Record<string, unknown> = {}
): string | null {
  if (!value) return null;
  return typeof value === "function" ? value(params) : value;
}

export async function getPuzzleTypeSpec(input: { puzzleType: string }) {
  const config = getPuzzleTypeConfig(input.puzzleType);
  const promptParams = { targetDifficulty: 6, puzzleType: input.puzzleType };
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    availableTypes: listPuzzleTypes(),
    difficultyRanges: config.difficulty.ranges,
    requiredFields: config.validation.requiredFields,
    generationGuidance: resolvePrompt(config.generation.systemPrompt, promptParams),
    userPromptTemplate: resolvePrompt(config.generation.userPromptTemplate, promptParams),
    hintCount: config.hints.count,
  };
}

export async function listRecentAnswers(input: { lookbackDays?: number; limit?: number }) {
  const lookbackDays = input.lookbackDays ?? 60;
  const limit = Math.min(input.limit ?? 40, 100);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  const puzzles = await getCollection("puzzles")
    .find({ createdAt: { $gte: cutoff } })
    .project({ answer: 1, category: 1, puzzle: 1, rebusPuzzle: 1, difficulty: 1 })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return {
    count: puzzles.length,
    answers: puzzles.map((p) => ({
      answer: String(p.answer ?? ""),
      category: String(p.category ?? ""),
      difficulty: typeof p.difficulty === "number" ? p.difficulty : null,
      preview: String((p as { rebusPuzzle?: string; puzzle?: string }).rebusPuzzle ?? p.puzzle ?? "").slice(
        0,
        80
      ),
    })),
  };
}

export async function checkUniqueness(input: CandidatePuzzle) {
  const display = input.rebusPuzzle;
  const fingerprint = createPuzzleFingerprint({
    rebusPuzzle: display,
    answer: input.answer,
    category: input.category,
  });

  const uniqueness = await validateUniqueness({
    rebusPuzzle: display,
    answer: input.answer,
    category: input.category,
    explanation: input.explanation,
  });

  const uniquenessScore = uniqueness.isUnique
    ? await calculateUniquenessScore({
        rebusPuzzle: display,
        answer: input.answer,
        category: input.category,
        explanation: input.explanation,
      })
    : 0;

  return {
    fingerprint,
    isUnique: uniqueness.isUnique,
    similarityScore: uniqueness.similarityScore,
    uniquenessScore,
    conflictingPuzzles: uniqueness.conflictingPuzzles,
    recommendations: uniqueness.recommendations,
  };
}

export async function calibratePuzzleDifficulty(input: CandidatePuzzle & { puzzleType?: string }) {
  const puzzleType = input.puzzleType ?? "rebus";
  const config = getPuzzleTypeConfig(puzzleType);

  if (config.difficulty?.calculate) {
    const calibrated = config.difficulty.calculate(input as never);
    return {
      calibratedDifficulty: calibrated,
      method: "type_config" as const,
      proposedDifficulty: input.difficulty,
    };
  }

  const calibration = await calibrateDifficulty({
    rebusPuzzle: input.rebusPuzzle,
    answer: input.answer,
    proposedDifficulty: input.difficulty,
    hints: input.hints,
  });

  return {
    calibratedDifficulty: calibration.calibratedDifficulty,
    method: "ai" as const,
    proposedDifficulty: input.difficulty,
    profile: calibration.difficultyProfile,
  };
}

/** Fast heuristic quality score (no extra model call). */
export function scorePuzzleQuality(input: CandidatePuzzle) {
  const issues: string[] = [];
  const strengths: string[] = [];

  const puzzle = input.rebusPuzzle.trim();
  const answer = input.answer.trim();

  if (!puzzle) issues.push("Empty puzzle display");
  if (!answer) issues.push("Empty answer");
  if (puzzle.toLowerCase() === answer.toLowerCase()) {
    issues.push("Puzzle text must not equal the answer");
  }
  if (puzzle.toLowerCase().includes(answer.toLowerCase()) && answer.length > 3) {
    issues.push("Answer appears literally in the puzzle text");
  }
  if (!input.explanation || input.explanation.length < 12) {
    issues.push("Explanation too short");
  } else {
    strengths.push("Has an explanation");
  }
  if (!input.hints || input.hints.length < 2) {
    issues.push("Need at least 2 progressive hints");
  } else {
    strengths.push(`${input.hints.length} hints`);
  }
  if (input.difficulty < 1 || input.difficulty > 10) {
    issues.push("Difficulty out of range");
  }

  // Visual signal for rebus-like content
  const hasEmoji = /[\p{Emoji}]/u.test(puzzle);
  if (hasEmoji) strengths.push("Uses visual emoji elements");

  let score = 78;
  score -= issues.length * 12;
  score += Math.min(10, strengths.length * 3);
  if (hasEmoji) score += 4;
  score = Math.max(0, Math.min(100, score));

  const verdict =
    score >= 85
      ? ("excellent" as const)
      : score >= 70
        ? ("good" as const)
        : score >= 60
          ? ("acceptable" as const)
          : score >= 45
            ? ("needs_work" as const)
            : ("reject" as const);

  return {
    overall: score,
    verdict,
    strengths,
    issues,
    publishable: score >= 70 && issues.length === 0,
  };
}

export function validatePuzzleCandidate(input: CandidatePuzzle & { puzzleType?: string }) {
  const puzzleType = input.puzzleType ?? "rebus";
  const config = getPuzzleTypeConfig(puzzleType);

  if (config.validation?.validate) {
    const result = config.validation.validate(input as never);
    return {
      valid: result.valid,
      errors: result.errors ?? [],
      puzzleType,
    };
  }

  const quality = scorePuzzleQuality(input);
  return {
    valid: quality.publishable,
    errors: quality.issues,
    puzzleType,
  };
}

export function fingerprintCandidate(input: Pick<CandidatePuzzle, "rebusPuzzle" | "answer" | "category">) {
  return createPuzzleFingerprint(input);
}

export function stableId(...parts: string[]) {
  return createHash("sha256").update(parts.join("::")).digest("hex").slice(0, 16);
}
