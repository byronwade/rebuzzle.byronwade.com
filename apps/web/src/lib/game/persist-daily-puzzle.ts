/**
 * Persist a daily puzzle with a real UUID so /api/puzzles/guess can resolve it.
 */

import {
  isAnswerRegistered,
  normalizeAnswerKey,
} from "@/ai/learning/answer-registry";
import {
  assertDailyChallenge,
  DAILY_CHALLENGE_POLICY,
} from "@/ai/puzzle-agent/daily-challenge";
import { PUZZLE_PLAYTEST_CONTRACT_VERSION } from "@/ai/puzzle-agent/review/puzzle-playtest-service";
import { PUZZLE_BOARD_RECOGNITION_PROFILES } from "@/ai/puzzle-agent/visual/presentation";
import { db } from "@/db";
import type { PuzzleVisual } from "@/db/models";
import { revalidateDailyPuzzle } from "@/lib/cache/revalidate-daily-puzzle";
import { logger } from "@/lib/logger";
import { toLegacyDifficultyLabel } from "./published-puzzle";

export type DailyHumanPlaytestAdmission = {
  policyVersion: "human-reviewed-daily-v1";
  candidateId: string;
  contractVersion: string;
  qualifiedDecisions: number;
  profileCoverage: Array<{ profileId: string; decisions: number }>;
  correct: number;
  solveRate: number;
  solveRateLowerBound: number;
  expectedSolveFloor: number;
  ambiguityReports: number;
  visualFailureReports: number;
  admittedAt: string;
};

function isValidHumanAdmission(
  value: unknown,
): value is DailyHumanPlaytestAdmission {
  if (!value || typeof value !== "object") return false;
  const admission = value as Partial<DailyHumanPlaytestAdmission>;
  const requiredProfiles = new Set<string>(
    PUZZLE_BOARD_RECOGNITION_PROFILES.map((profile) => profile.id),
  );
  const coverage = admission.profileCoverage;
  const validCoverage =
    Array.isArray(coverage) &&
    coverage.length === requiredProfiles.size &&
    new Set(coverage.map((profile) => profile.profileId)).size ===
      requiredProfiles.size &&
    coverage.every(
      (profile) =>
        requiredProfiles.has(profile.profileId) && profile.decisions >= 5,
    );
  return (
    admission.policyVersion === "human-reviewed-daily-v1" &&
    typeof admission.candidateId === "string" &&
    admission.candidateId.trim().length > 0 &&
    admission.contractVersion === PUZZLE_PLAYTEST_CONTRACT_VERSION &&
    validCoverage &&
    typeof admission.qualifiedDecisions === "number" &&
    admission.qualifiedDecisions >= requiredProfiles.size * 5 &&
    typeof admission.correct === "number" &&
    admission.correct >= 0 &&
    admission.correct <= admission.qualifiedDecisions &&
    typeof admission.solveRate === "number" &&
    admission.solveRate >= 0 &&
    admission.solveRate <= 1 &&
    typeof admission.solveRateLowerBound === "number" &&
    typeof admission.expectedSolveFloor === "number" &&
    admission.solveRateLowerBound >= admission.expectedSolveFloor &&
    typeof admission.ambiguityReports === "number" &&
    admission.ambiguityReports <= 1 &&
    admission.visualFailureReports === 0 &&
    typeof admission.admittedAt === "string" &&
    Number.isFinite(Date.parse(admission.admittedAt))
  );
}

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
  humanPlaytestAdmission?: DailyHumanPlaytestAdmission;
};

/**
 * Upsert-ish: if today's puzzle already exists, return it.
 * Otherwise insert with UTC-midnight publishedAt and a real UUID.
 */
export async function persistDailyPuzzle(
  input: PersistDailyPuzzleInput,
): Promise<{
  id: string;
  alreadyExisted: boolean;
}> {
  const existing = await db.puzzleOps.findByDate(input.dateString);
  if (existing) {
    return { id: existing.id, alreadyExisted: true };
  }

  if (input.puzzleType === "rebus")
    assertDailyChallenge({
      ...input,
      reasoningEvidence: input.metadataExtra?.reasoningEvidence,
      reasoningEvidenceSource: input.metadataExtra?.reasoningEvidenceSource,
    });

  if (
    input.aiGenerated &&
    input.puzzleType === "rebus" &&
    !isValidHumanAdmission(input.humanPlaytestAdmission)
  ) {
    throw new Error(
      "Human playtest admission is required to publish an AI-generated daily rebus",
    );
  }

  // Never persist a duplicate answer — archive (retired) puzzles still count
  const answerCheck = await isAnswerRegistered(input.answer);
  if (answerCheck.taken) {
    throw new Error(
      `Refusing to persist duplicate answer (matches puzzle ${answerCheck.puzzleId}). Generate a unique answer.`,
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
        ...(input.humanPlaytestAdmission
          ? { humanPlaytestAdmission: input.humanPlaytestAdmission }
          : {}),
        // Permanent uniqueness key (survives soft-retire / archive)
        answerKey,
        uniquenessContract: "archive-v1",
        dailyPublicationKey: input.dateString,
        dailyChallengePolicy: DAILY_CHALLENGE_POLICY,
        archived: false,
        // Intentionally omit keyword (= answer) from metadata
      },
      rebusPuzzle:
        input.rebusPuzzle ??
        (input.puzzleType === "rebus" ? input.puzzleDisplay : undefined),
    });
  } catch (error) {
    const duplicateKey =
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11_000;
    if (duplicateKey) {
      const concurrent = await db.puzzleOps.findByDate(input.dateString);
      if (concurrent) return { id: concurrent.id, alreadyExisted: true };
      throw new Error(
        "Concurrent publication used this answer before insertion completed",
        {
          cause: error,
        },
      );
    }
    throw error;
  }

  revalidateDailyPuzzle(input.dateString);

  logger.info("Persisted daily puzzle", {
    puzzleId: id,
    dateString: input.dateString,
    aiGenerated: input.aiGenerated,
  });

  return { id, alreadyExisted: false };
}
