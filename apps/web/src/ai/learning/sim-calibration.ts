/**
 * Player-sim calibration — reconcile LLM estimatedSolveRate with live solve rates.
 *
 * Over time Apex tends to over/under-estimate how hard puzzles feel.
 * We compute a rolling bias and apply it before the tournament rubric.
 */

import { getCollection } from "@/db/mongodb";

export type SimCalibration = {
  sampleSize: number;
  /** Mean (liveSolveRate − estimatedSolveRate). Positive ⇒ sims were too pessimistic. */
  meanBias: number;
  /** Clamped adjustment to add to a new estimate (−0.2…+0.2). */
  adjustment: number;
  confidence: number;
  notes: string[];
};

const EMPTY: SimCalibration = {
  sampleSize: 0,
  meanBias: 0,
  adjustment: 0,
  confidence: 0,
  notes: ["No paired sim/live data yet"],
};

/**
 * Pure helper — unit-tested.
 */
export function computeSimCalibrationFromPairs(
  pairs: Array<{ estimated: number; live: number }>,
  minSamples = 6
): SimCalibration {
  const clean = pairs.filter(
    (p) =>
      Number.isFinite(p.estimated) &&
      Number.isFinite(p.live) &&
      p.estimated >= 0 &&
      p.estimated <= 1 &&
      p.live >= 0 &&
      p.live <= 1
  );

  if (clean.length < minSamples) {
    return {
      ...EMPTY,
      sampleSize: clean.length,
      notes: [`Need ${minSamples} paired samples (have ${clean.length})`],
    };
  }

  const biases = clean.map((p) => p.live - p.estimated);
  const meanBias = biases.reduce((a, b) => a + b, 0) / biases.length;
  // Only correct a fraction of the observed bias to avoid oscillation
  const adjustment = Math.max(-0.2, Math.min(0.2, meanBias * 0.6));
  const confidence = Math.min(0.9, 0.35 + clean.length / 40);
  const notes: string[] = [];
  if (adjustment > 0.04) {
    notes.push(
      `Sims under-estimate solve rate by ~${(meanBias * 100).toFixed(0)}pts — raising estimates`
    );
  } else if (adjustment < -0.04) {
    notes.push(
      `Sims over-estimate solve rate by ~${(Math.abs(meanBias) * 100).toFixed(0)}pts — lowering estimates`
    );
  } else {
    notes.push("Sim estimates aligned with live solve rates");
  }

  return {
    sampleSize: clean.length,
    meanBias,
    adjustment,
    confidence,
    notes,
  };
}

/**
 * Load recent puzzles that have both estimated + live solve rates.
 */
export async function loadSimCalibration(lookbackDays = 45): Promise<SimCalibration> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  try {
    const docs = (await getCollection("puzzles")
      .find({
        "metadata.estimatedSolveRate": { $exists: true, $type: "number" },
        "metadata.liveSolveRate": { $exists: true, $type: "number" },
        "metadata.liveFinals": { $gte: 8 },
        createdAt: { $gte: cutoff },
      })
      .project({
        "metadata.estimatedSolveRate": 1,
        "metadata.liveSolveRate": 1,
      })
      .limit(80)
      .toArray()) as Array<{
      metadata?: { estimatedSolveRate?: number; liveSolveRate?: number };
    }>;

    const pairs = docs
      .map((d) => ({
        estimated: d.metadata?.estimatedSolveRate ?? Number.NaN,
        live: d.metadata?.liveSolveRate ?? Number.NaN,
      }))
      .filter((p) => Number.isFinite(p.estimated) && Number.isFinite(p.live));

    return computeSimCalibrationFromPairs(pairs);
  } catch {
    return EMPTY;
  }
}

/**
 * Apply calibration to a raw estimatedSolveRate (0–1).
 */
export function applySimCalibration(
  estimatedSolveRate: number,
  calibration: Pick<SimCalibration, "adjustment">
): number {
  const next = estimatedSolveRate + calibration.adjustment;
  return Math.max(0.05, Math.min(0.95, next));
}
