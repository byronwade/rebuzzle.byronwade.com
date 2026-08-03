/**
 * Technique-family difficulty calibrator.
 *
 * Reorders curriculum technique preference using observed human solve rates
 * (live puzzle metadata and optional playtest strata). Techniques that players
 * crush get demoted when the window is too easy; techniques that players miss
 * get promoted when the window is too hard.
 */

import { getCollection } from "@/db/mongodb";
import type { TechniqueId } from "../technique-library";

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

/**
 * Aggregate liveSolveRate by techniqueId from published puzzles.
 */
export async function loadTechniqueSolveRates(input?: {
  lookbackDays?: number;
  limit?: number;
}): Promise<TechniqueCalibrationSnapshot> {
  const lookbackDays = input?.lookbackDays ?? 45;
  const limit = Math.min(input?.limit ?? 400, 800);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  try {
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
      .limit(limit)
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

    const rates = [...buckets.entries()]
      .map(([techniqueId, bucket]) => ({
        techniqueId,
        sampleSize: bucket.count,
        solveRate: bucket.count ? bucket.sum / bucket.count : 0,
      }))
      .sort((a, b) => b.sampleSize - a.sampleSize);

    return {
      lookbackDays,
      sampleSize: rates.reduce((sum, row) => sum + row.sampleSize, 0),
      rates,
      notes: rates.length
        ? [`Loaded ${rates.length} technique families with live solve rates (${lookbackDays}d)`]
        : ["No technique-family live solve rates yet — curriculum uses diversity order only"],
    };
  } catch {
    return {
      lookbackDays,
      sampleSize: 0,
      rates: [],
      notes: ["Technique calibration unavailable — continue without solve-rate bias"],
    };
  }
}
