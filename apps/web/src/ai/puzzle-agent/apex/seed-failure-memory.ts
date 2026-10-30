import { normalizeAnswerKey } from "../quality";

// Bump when the planner's composition contract changes: old failures must not
// suppress a newly capable planner. This is a preference, never an answer ban.
export const MECHANISM_PLANNER_VERSION = "mechanism-plan-v1";

export function seedTechniqueKey(answer: string, techniqueId: string): string {
  return `${normalizeAnswerKey(answer)}:${techniqueId}`;
}

type SeedFailure = {
  _id: string;
  pairKey: string;
  plannerVersion: string;
  lastRejectedAt: Date;
};

export async function loadRecentFailedSeedPairs(
  plannerVersion: string,
  now = new Date()
): Promise<Set<string>> {
  try {
    const { getCollection } = await import("@/db/mongodb");
    const records = await getCollection<SeedFailure>("puzzleSeedQualityFailures")
      .find({
        plannerVersion,
        lastRejectedAt: { $gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
      })
      .limit(500)
      .toArray();
    return new Set(records.map((record) => record.pairKey));
  } catch {
    return new Set();
  }
}

/** Caller must have explicit score/difficulty feedback eligibility, not just a typed rejection. */
export async function recordSeedQualityFailure(input: {
  answer: string;
  techniqueId: string;
  plannerVersion: string;
}): Promise<void> {
  if (process.env.REBUZZLE_DIAGNOSTIC_READ_ONLY === "1") return;
  try {
    const { getCollection } = await import("@/db/mongodb");
    const pairKey = seedTechniqueKey(input.answer, input.techniqueId);
    await getCollection<SeedFailure>("puzzleSeedQualityFailures").updateOne(
      { _id: `${input.plannerVersion}:${pairKey}` },
      { $set: { pairKey, plannerVersion: input.plannerVersion, lastRejectedAt: new Date() } },
      { upsert: true }
    );
  } catch {
    // Memory is advisory; database outages cannot turn into a generation outage.
  }
}
