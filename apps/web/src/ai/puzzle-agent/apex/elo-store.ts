/**
 * Pairwise Elo persistence for Apex finalist ranking.
 *
 * Ratings live in Mongo (`puzzleEloRatings`). Matches update two subjects at
 * a time (answer keys or technique ids). Higher Elo = harder for players.
 */

import { getCollection } from "@/db/mongodb";
import { ELO_BASE } from "./elo-ratings";

export type EloSubjectKind = "answer" | "technique";

export type PuzzleEloRatingDoc = {
  _id?: string;
  /** Packed answer key or technique id */
  key: string;
  kind: EloSubjectKind;
  rating: number;
  matches: number;
  updatedAt: Date;
  createdAt: Date;
};

export type EloMatchResult = {
  winnerKey: string;
  loserKey: string;
  kind: EloSubjectKind;
  winnerBefore: number;
  loserBefore: number;
  winnerAfter: number;
  loserAfter: number;
};

/** Classic Elo expected score for A against B. */
export function expectedEloScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

/** Apply one pairwise result; winner gains, loser loses (zero-sum). */
export function applyEloMatch(
  winnerRating: number,
  loserRating: number,
  kFactor = 24
): { winner: number; loser: number } {
  const expectedWinner = expectedEloScore(winnerRating, loserRating);
  const expectedLoser = 1 - expectedWinner;
  return {
    winner: Math.round(winnerRating + kFactor * (1 - expectedWinner)),
    loser: Math.round(loserRating + kFactor * (0 - expectedLoser)),
  };
}

/** Answers match `resolveCandidateElo`; techniques keep underscores. */
function normalizeKey(kind: EloSubjectKind, key: string): string {
  const lower = key.toLowerCase();
  if (kind === "technique") return lower.replace(/[^a-z0-9_]/g, "");
  return lower.replace(/[^a-z0-9]/g, "");
}

async function readRating(kind: EloSubjectKind, key: string): Promise<PuzzleEloRatingDoc> {
  const normalized = normalizeKey(kind, key);
  const now = new Date();
  const existing = (await getCollection<PuzzleEloRatingDoc>("puzzleEloRatings").findOne({
    kind,
    key: normalized,
  })) as PuzzleEloRatingDoc | null;
  if (existing) return existing;
  return {
    key: normalized,
    kind,
    rating: ELO_BASE,
    matches: 0,
    createdAt: now,
    updatedAt: now,
  };
}

async function writeRating(doc: PuzzleEloRatingDoc): Promise<void> {
  const now = new Date();
  await getCollection<PuzzleEloRatingDoc>("puzzleEloRatings").updateOne(
    { kind: doc.kind, key: doc.key },
    {
      $set: {
        rating: doc.rating,
        matches: doc.matches,
        updatedAt: now,
      },
      $setOnInsert: {
        kind: doc.kind,
        key: doc.key,
        createdAt: doc.createdAt ?? now,
      },
    },
    { upsert: true }
  );
}

/** Persist a pairwise match. Higher Elo = harder; pass the harder subject as winner. */
export async function recordPairwiseEloMatch(input: {
  winnerKey: string;
  loserKey: string;
  kind: EloSubjectKind;
  kFactor?: number;
}): Promise<EloMatchResult | null> {
  const winnerKey = normalizeKey(input.kind, input.winnerKey);
  const loserKey = normalizeKey(input.kind, input.loserKey);
  if (!winnerKey || !loserKey || winnerKey === loserKey) return null;

  try {
    const [winnerDoc, loserDoc] = await Promise.all([
      readRating(input.kind, winnerKey),
      readRating(input.kind, loserKey),
    ]);
    const next = applyEloMatch(winnerDoc.rating, loserDoc.rating, input.kFactor ?? 24);
    await Promise.all([
      writeRating({
        ...winnerDoc,
        rating: next.winner,
        matches: winnerDoc.matches + 1,
      }),
      writeRating({
        ...loserDoc,
        rating: next.loser,
        matches: loserDoc.matches + 1,
      }),
    ]);
    return {
      winnerKey,
      loserKey,
      kind: input.kind,
      winnerBefore: winnerDoc.rating,
      loserBefore: loserDoc.rating,
      winnerAfter: next.winner,
      loserAfter: next.loser,
    };
  } catch {
    return null;
  }
}

/** Load answer-key → Elo map for finalist pre-ranking. */
export async function loadAnswerEloMap(input?: {
  limit?: number;
}): Promise<Map<string, number>> {
  const limit = Math.min(input?.limit ?? 500, 2000);
  const map = new Map<string, number>();
  try {
    const docs = (await getCollection<PuzzleEloRatingDoc>("puzzleEloRatings")
      .find({ kind: "answer" })
      .project({ key: 1, rating: 1 })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray()) as Array<{ key?: string; rating?: number }>;
    for (const doc of docs) {
      if (doc.key && typeof doc.rating === "number" && Number.isFinite(doc.rating)) {
        map.set(doc.key, Math.round(doc.rating));
      }
    }
  } catch {
    // Fail open — curriculum continues with technique priors only.
  }
  return map;
}

export type PlaytestEloCandidate = {
  answer: string;
  techniqueId?: string;
  decisions: number;
  solveRate: number | null;
};

/**
 * Pure planner: within each technique, lower solve-rate (harder) answers beat
 * higher solve-rate cousins. Also builds technique pairwise matches.
 */
export function planPlaytestEloMatches(input: {
  candidates: readonly PlaytestEloCandidate[];
  minDecisions?: number;
}): Array<{ winnerKey: string; loserKey: string; kind: EloSubjectKind }> {
  const minDecisions = input.minDecisions ?? 4;
  const matches: Array<{ winnerKey: string; loserKey: string; kind: EloSubjectKind }> = [];

  const byTechnique = new Map<string, PlaytestEloCandidate[]>();
  for (const candidate of input.candidates) {
    if (
      candidate.decisions < minDecisions ||
      candidate.solveRate === null ||
      !Number.isFinite(candidate.solveRate)
    ) {
      continue;
    }
    const techniqueId = candidate.techniqueId ?? "unknown";
    const bucket = byTechnique.get(techniqueId) ?? [];
    bucket.push(candidate);
    byTechnique.set(techniqueId, bucket);
  }

  for (const [techniqueId, rows] of byTechnique) {
    const ranked = [...rows].sort((a, b) => (a.solveRate ?? 0.5) - (b.solveRate ?? 0.5));
    for (let i = 0; i < ranked.length - 1; i++) {
      const harder = ranked[i]!;
      const easier = ranked[i + 1]!;
      if ((harder.solveRate ?? 0) >= (easier.solveRate ?? 1)) continue;
      matches.push({
        winnerKey: harder.answer,
        loserKey: easier.answer,
        kind: "answer",
      });
    }

    // Technique-level: average solve rate vs other techniques later.
    if (techniqueId !== "unknown" && ranked.length) {
      const avg =
        ranked.reduce((sum, row) => sum + (row.solveRate ?? 0.5), 0) / ranked.length;
      // Stash as synthetic marker — technique pairwise applied in sync below.
      void avg;
    }
  }

  const techniqueAvgs = [...byTechnique.entries()]
    .filter(([id]) => id !== "unknown")
    .map(([techniqueId, rows]) => ({
      techniqueId,
      solveRate: rows.reduce((sum, row) => sum + (row.solveRate ?? 0.5), 0) / rows.length,
      decisions: rows.reduce((sum, row) => sum + row.decisions, 0),
    }))
    .filter((row) => row.decisions >= minDecisions)
    .sort((a, b) => a.solveRate - b.solveRate);

  for (let i = 0; i < techniqueAvgs.length - 1; i++) {
    const harder = techniqueAvgs[i]!;
    const easier = techniqueAvgs[i + 1]!;
    if (harder.solveRate >= easier.solveRate) continue;
    matches.push({
      winnerKey: harder.techniqueId,
      loserKey: easier.techniqueId,
      kind: "technique",
    });
  }

  return matches;
}

/** Apply playtest strata as pairwise Elo updates (bounded write set). */
export async function syncPlaytestPairwiseElo(input: {
  candidates: readonly PlaytestEloCandidate[];
  maxMatches?: number;
}): Promise<{ applied: number; planned: number }> {
  const planned = planPlaytestEloMatches({ candidates: input.candidates });
  const maxMatches = Math.min(input.maxMatches ?? 40, planned.length);
  let applied = 0;
  for (const match of planned.slice(0, maxMatches)) {
    const result = await recordPairwiseEloMatch(match);
    if (result) applied += 1;
  }
  return { applied, planned: planned.length };
}
