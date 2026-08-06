/**
 * Technique-family difficulty calibrator.
 *
 * Reorders curriculum technique preference using observed human solve rates
 * (live puzzle metadata merged with playtest strata). Techniques that players
 * crush get demoted when the window is too easy; techniques that players miss
 * get promoted when the window is too hard.
 */

import { getCollection } from "@/db/mongodb";
import type { TechniqueId } from "../technique-library";
import { mergeTechniqueSolveRates, techniqueRatesFromPlaytestStrata } from "./playtest-calibration";

export type TechniqueSolveRate = {
  techniqueId: string;
  sampleSize: number;
  solveRate: number;
};

export type TechniqueCalibrationSnapshot = {
  lookbackDays: number;
  sampleSize: number;
  rates: TechniqueSolveRate[];
  notes: string[];
  /** Playtest-only rates before merge (for Elo sync / drift breakers). */
  playtestRates?: TechniqueSolveRate[];
};

const MIN_SAMPLES = 4;

/**
 * Pure reorder — unit-tested without Mongo.
 *
 * - tooEasy: prefer lower solve-rate (harder) techniques first
 * - tooHard: prefer higher solve-rate (friendlier) techniques first
 * - balanced / insufficient data: keep input order
 */
export function biasTechniquesBySolveRates(input: {
  preferredTechniques: readonly TechniqueId[];
  rates: readonly TechniqueSolveRate[];
  tooEasy: boolean;
  tooHard: boolean;
  minSamples?: number;
}): { techniques: TechniqueId[]; notes: string[] } {
  const minSamples = input.minSamples ?? MIN_SAMPLES;
  const rateById = new Map(
    input.rates.flatMap((row) =>
      row.sampleSize >= minSamples && Number.isFinite(row.solveRate)
        ? ([[row.techniqueId, row]] as const)
        : []
    )
  );

  if (!rateById.size || (!input.tooEasy && !input.tooHard)) {
    return { techniques: [...input.preferredTechniques], notes: [] };
  }

  const scored = input.preferredTechniques.map((techniqueId, index) => {
    const observed = rateById.get(techniqueId);
    const solveRate = observed?.solveRate ?? 0.5;
    // Higher score = earlier in preferred list.
    const pressure = input.tooEasy ? 1 - solveRate : solveRate;
    return { techniqueId, index, pressure, sampleSize: observed?.sampleSize ?? 0 };
  });

  scored.sort((a, b) => {
    if (b.pressure !== a.pressure) return b.pressure - a.pressure;
    return a.index - b.index;
  });

  const notes: string[] = [];
  const head = scored[0];
  const tail = scored[scored.length - 1];
  if (head && tail && head.techniqueId !== tail.techniqueId) {
    notes.push(
      input.tooEasy
        ? `Technique calibration (too easy): prefer ${head.techniqueId} over high-solve ${tail.techniqueId}`
        : `Technique calibration (too hard): prefer friendlier ${head.techniqueId} over low-solve ${tail.techniqueId}`
    );
  }

  return {
    techniques: scored.map((row) => row.techniqueId),
    notes,
  };
}

async function loadLiveTechniqueSolveRates(input: {
  lookbackDays: number;
  limit: number;
}): Promise<TechniqueSolveRate[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - input.lookbackDays);

  const docs = (await getCollection("puzzles")
    .find({
      createdAt: { $gte: cutoff },
      "metadata.techniqueId": { $type: "string" },
      "metadata.liveSolveRate": { $type: "number" },
    })
    .project({
      "metadata.techniqueId": 1,
      "metadata.liveSolveRate": 1,
    })
    .sort({ createdAt: -1 })
    .limit(input.limit)
    .toArray()) as Array<{
    metadata?: { techniqueId?: string; liveSolveRate?: number };
  }>;

  const buckets = new Map<string, { sum: number; count: number }>();
  for (const doc of docs) {
    const techniqueId = doc.metadata?.techniqueId;
    const liveSolveRate = doc.metadata?.liveSolveRate;
    if (!techniqueId || typeof liveSolveRate !== "number" || !Number.isFinite(liveSolveRate)) {
      continue;
    }
    const bucket = buckets.get(techniqueId) ?? { sum: 0, count: 0 };
    bucket.sum += Math.max(0, Math.min(1, liveSolveRate));
    bucket.count += 1;
    buckets.set(techniqueId, bucket);
  }

  return [...buckets.entries()]
    .map(([techniqueId, bucket]) => ({
      techniqueId,
      sampleSize: bucket.count,
      solveRate: bucket.count ? bucket.sum / bucket.count : 0,
    }))
    .sort((a, b) => b.sampleSize - a.sampleSize);
}

async function loadPlaytestTechniqueSolveRates(): Promise<{
  rates: TechniqueSolveRate[];
  candidates: Array<{
    answer: string;
    techniqueId?: string;
    decisions: number;
    solveRate: number | null;
  }>;
  notes: string[];
}> {
  try {
    const { puzzlePlaytestService } = await import("../review/puzzle-playtest-server");
    const report = await puzzlePlaytestService.getReport("operational-audit", new Date(), {
      readOnly: true,
    });
    const rates = techniqueRatesFromPlaytestStrata(report.techniqueScores);
    const candidates = report.visibleCandidates.map((row) => ({
      answer: row.answer,
      techniqueId: row.techniqueId,
      decisions: row.decisions,
      solveRate: row.solveRate,
    }));
    return {
      rates,
      candidates,
      notes: rates.length
        ? [`Loaded ${rates.length} technique families from human playtest strata`]
        : ["No playtest technique strata yet"],
    };
  } catch {
    return {
      rates: [],
      candidates: [],
      notes: ["Playtest calibration unavailable — using live solve rates only"],
    };
  }
}

/**
 * Aggregate liveSolveRate by techniqueId from published puzzles, merged with
 * human playtest strata. Optionally syncs pairwise Elo from playtest candidates.
 */
export async function loadTechniqueSolveRates(input?: {
  lookbackDays?: number;
  limit?: number;
  syncElo?: boolean;
}): Promise<TechniqueCalibrationSnapshot> {
  const lookbackDays = input?.lookbackDays ?? 45;
  const limit = Math.min(input?.limit ?? 400, 800);
  const syncElo = input?.syncElo !== false;

  try {
    const [live, playtest] = await Promise.all([
      loadLiveTechniqueSolveRates({ lookbackDays, limit }),
      loadPlaytestTechniqueSolveRates(),
    ]);

    const rates = mergeTechniqueSolveRates(live, playtest.rates);
    const notes = [
      live.length
        ? `Loaded ${live.length} technique families with live solve rates (${lookbackDays}d)`
        : "No technique-family live solve rates yet",
      ...playtest.notes,
    ];

    if (syncElo && playtest.candidates.length) {
      try {
        const { syncPlaytestPairwiseElo } = await import("./elo-store");
        const sync = await syncPlaytestPairwiseElo({ candidates: playtest.candidates });
        if (sync.applied > 0) {
          notes.push(`Synced ${sync.applied}/${sync.planned} playtest pairwise Elo matches`);
        }
      } catch {
        notes.push("Playtest Elo sync skipped");
      }
    }

    if (!rates.length) {
      notes.push("Curriculum uses diversity order only");
    }

    return {
      lookbackDays,
      sampleSize: rates.reduce((sum, row) => sum + row.sampleSize, 0),
      rates,
      playtestRates: playtest.rates,
      notes,
    };
  } catch {
    return {
      lookbackDays,
      sampleSize: 0,
      rates: [],
      playtestRates: [],
      notes: ["Technique calibration unavailable — continue without solve-rate bias"],
    };
  }
}
