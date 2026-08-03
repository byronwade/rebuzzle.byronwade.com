/**
 * Generation audit trail — durable record of every AI generation attempt.
 * Powers admin observability and long-term system improvement.
 */

import { getCollection } from "@/db/mongodb";
import { logger } from "@/lib/logger";
import type { AnswerSeedVisualCue } from "../puzzle-agent/apex/types";

export type GenerationAuditRecord = {
  id: string;
  dateString: string;
  puzzleId?: string;
  engine: "apex" | "eve" | "fallback";
  status: "success" | "failed" | "fallback";
  targetDifficulty: number;
  baselineDifficulty?: number;
  learningDelta?: number;
  learningReason?: string;
  techniqueId?: string;
  difficultyLevel?: string;
  qualityScore?: number;
  funScore?: number;
  uniquenessScore?: number;
  fingerprint?: string;
  answerKey?: string;
  /** Exact Apex seed contract used to ground the candidate, when applicable. */
  answerSeed?: string;
  /** Exact host-owned visual ingredients required by that seed contract. */
  answerSeedCuePlan?: readonly AnswerSeedVisualCue[];
  estimatedSolveRate?: number;
  simCalibrationBias?: number;
  candidateCount?: number;
  durationMs?: number;
  error?: string;
  attemptedGeneration?: boolean;
  createdAt: Date;
};

/**
 * Persist an audit row for a generation attempt (best-effort).
 */
export async function recordGenerationAudit(
  input: Omit<GenerationAuditRecord, "id" | "createdAt"> & { id?: string }
): Promise<string | null> {
  const id = input.id ?? crypto.randomUUID();
  try {
    await getCollection("generationAudits").insertOne({
      ...input,
      id,
      createdAt: new Date(),
    });
    return id;
  } catch (error) {
    logger.warn("generation audit write failed", {
      error: error instanceof Error ? error.message : String(error),
      dateString: input.dateString,
      status: input.status,
    });
    return null;
  }
}

/**
 * Recent generation audits for admin / health checks.
 */
export async function listRecentGenerationAudits(limit = 30): Promise<GenerationAuditRecord[]> {
  try {
    const docs = await getCollection("generationAudits")
      .find({})
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .toArray();
    return docs as unknown as GenerationAuditRecord[];
  } catch {
    return [];
  }
}

/**
 * Compact health snapshot for the learning + generation system.
 */
export async function getGenerationSystemHealth(): Promise<{
  auditsLast7d: number;
  successRate: number;
  fallbackRate: number;
  apexShare: number;
  avgQuality: number | null;
  lastSuccessAt: string | null;
}> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  try {
    const docs = (await getCollection("generationAudits")
      .find({ createdAt: { $gte: cutoff } })
      .project({
        status: 1,
        engine: 1,
        qualityScore: 1,
        createdAt: 1,
      })
      .limit(500)
      .toArray()) as Array<{
      status?: string;
      engine?: string;
      qualityScore?: number;
      createdAt?: Date;
    }>;

    const total = docs.length;
    const successes = docs.filter((d) => d.status === "success").length;
    const fallbacks = docs.filter((d) => d.status === "fallback").length;
    const apex = docs.filter((d) => d.engine === "apex").length;
    const qualities = docs
      .map((d) => d.qualityScore)
      .filter((q): q is number => typeof q === "number");
    const lastSuccess = docs.find((d) => d.status === "success");

    return {
      auditsLast7d: total,
      successRate: total ? successes / total : 0,
      fallbackRate: total ? fallbacks / total : 0,
      apexShare: total ? apex / total : 0,
      avgQuality: qualities.length ? qualities.reduce((a, b) => a + b, 0) / qualities.length : null,
      lastSuccessAt: lastSuccess?.createdAt ? new Date(lastSuccess.createdAt).toISOString() : null,
    };
  } catch {
    return {
      auditsLast7d: 0,
      successRate: 0,
      fallbackRate: 0,
      apexShare: 0,
      avgQuality: null,
      lastSuccessAt: null,
    };
  }
}
