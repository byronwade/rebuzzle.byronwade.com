import { z } from "zod";

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const label = z.string().trim().min(1).max(160);
export const ComparisonObservationSchema = z.object({
  schemaVersion: z.literal(1),
  briefId: label,
  briefSha256: hash,
  archiveSha256: hash,
  systemSha256: hash,
  evaluatorVersion: label,
  family: label,
  tier: z.enum(["Hard", "Difficult", "Evil", "Impossible"]),
  technique: label,
  variant: z.enum(["baseline", "challenger"]),
  candidateLimit: z.number().int().positive().max(500),
  callLimit: z.number().int().positive().max(10000),
  candidatesUsed: z.number().int().nonnegative(),
  callsUsed: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative().finite(),
  durationMs: z.number().nonnegative().finite(),
  accepted: z.boolean(),
  outputSha256: hash.nullable(),
  gates: z.object({
    uniqueness: z.boolean(),
    recognition: z.boolean(),
    blindSolve: z.boolean(),
    editorial: z.boolean(),
    difficulty: z.boolean(),
    hints: z.boolean(),
  }),
});
export type ComparisonObservation = z.infer<typeof ComparisonObservationSchema>;
export const ComparisonReviewSchema = z.object({
  briefId: label,
  reviewerId: label,
  blinded: z.literal(true),
  baselineOutputSha256: hash,
  challengerOutputSha256: hash,
  winner: z.enum(["baseline", "challenger", "tie"]),
});
export type ComparisonReview = z.infer<typeof ComparisonReviewSchema>;

function quantile95(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1]!;
}
function summarize(rows: ComparisonObservation[]) {
  const accepted = rows.filter((r) => r.accepted).length;
  const costUsd = rows.reduce((total, r) => total + r.costUsd, 0);
  return {
    briefs: rows.length,
    accepted,
    acceptanceYield: rows.length ? accepted / rows.length : null,
    costUsd,
    costPerAcceptedUsd: accepted ? costUsd / accepted : null,
    p95DurationMs: quantile95(rows.map((r) => r.durationMs)),
    candidatesUsed: rows.reduce((n, r) => n + r.candidatesUsed, 0),
    callsUsed: rows.reduce((n, r) => n + r.callsUsed, 0),
  };
}
/** Wilson interval for decisive independent family outcomes, not individual reviewer votes. */
export function wilsonInterval(wins: number, total: number): [number, number] | null {
  if (!total) return null;
  const z = 1.959963984540054;
  const p = wins / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const radius = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) / denominator;
  return [Math.max(0, center - radius), Math.min(1, center + radius)];
}
function consensus(votes: Array<"baseline" | "challenger" | "tie">) {
  const challenger = votes.filter((v) => v === "challenger").length;
  const baseline = votes.filter((v) => v === "baseline").length;
  return challenger > votes.length / 2
    ? "challenger"
    : baseline > votes.length / 2
      ? "baseline"
      : "tie";
}

/** Offline experiment evidence only. Never changes production model routing or quality gates. */
export function compareGenerators(input: { observations: unknown[]; reviews: unknown[] }) {
  const rows = input.observations.map((r) => ComparisonObservationSchema.parse(r));
  const acceptedOutputs = new Set<string>();
  const systemByVariant = new Map<string, string>();
  let archive: string | undefined;
  let evaluator: string | undefined;
  const pairs = new Map<
    string,
    Partial<Record<"baseline" | "challenger", ComparisonObservation>>
  >();
  for (const row of rows) {
    const priorSystem = systemByVariant.get(row.variant);
    if (priorSystem && priorSystem !== row.systemSha256) throw new Error(`System changed within ${row.variant}`);
    systemByVariant.set(row.variant, row.systemSha256);
    if ((archive && archive !== row.archiveSha256) || (evaluator && evaluator !== row.evaluatorVersion)) throw new Error("Archive or evaluator changed during experiment");
    archive = row.archiveSha256; evaluator = row.evaluatorVersion;
    const pair = pairs.get(row.briefId) ?? {};
    if (pair[row.variant])
      throw new Error(`Duplicate ${row.variant} observation for ${row.briefId}`);
    if (row.candidatesUsed > row.candidateLimit || row.callsUsed > row.callLimit)
      throw new Error(`Budget exceeded for ${row.briefId}`);
    if (row.accepted && !Object.values(row.gates).every(Boolean))
      throw new Error(`Accepted puzzle failed a gate for ${row.briefId}`);
    if (row.accepted) {
      if (!row.outputSha256)
        throw new Error(`Accepted puzzle lacks an output digest for ${row.briefId}`);
      const outputKey = `${row.variant}:${row.outputSha256}`;
      if (acceptedOutputs.has(outputKey))
        throw new Error(`Repeated accepted puzzle for ${row.variant}`);
      acceptedOutputs.add(outputKey);
    }
    pair[row.variant] = row;
    pairs.set(row.briefId, pair);
  }
  const tiers = { Hard: 0, Difficult: 0, Evil: 0, Impossible: 0 };
  const techniques = new Set<string>();
  const briefHashes = new Set<string>();
  let challengerOnlyAccepted = 0;
  let baselineOnlyAccepted = 0;
  let bothAccepted = 0;
  for (const [id, pair] of pairs) {
    if (!pair.baseline || !pair.challenger)
      throw new Error(`Unpaired brief ${id}; include failed runs too`);
    const a = pair.baseline;
    const b = pair.challenger;
    if (briefHashes.has(a.briefSha256)) throw new Error("Repeated brief under different ids");
    briefHashes.add(a.briefSha256);
    for (const key of [
      "briefSha256",
      "archiveSha256",
      "evaluatorVersion",
      "family",
      "tier",
      "technique",
      "candidateLimit",
      "callLimit",
    ] as const) {
      if (a[key] !== b[key]) throw new Error(`Unfair comparison for ${id}: ${key} differs`);
    }
    tiers[a.tier] += 1;
    techniques.add(a.technique);
    if (a.accepted && b.accepted) bothAccepted += 1;
    if (b.accepted && !a.accepted) challengerOnlyAccepted += 1;
    if (a.accepted && !b.accepted) baselineOnlyAccepted += 1;
  }
  const reviewByBrief = new Map<string, ComparisonReview[]>();
  const seenReviews = new Set<string>();
  for (const raw of input.reviews) {
    const review = ComparisonReviewSchema.parse(raw);
    const pair = pairs.get(review.briefId);
    if (!pair) throw new Error(`Unknown reviewed brief ${review.briefId}`);
    if (!pair.baseline?.accepted || !pair.challenger?.accepted)
      throw new Error(`Human comparison requires two accepted puzzles: ${review.briefId}`);
    if (
      review.baselineOutputSha256 !== pair.baseline.outputSha256 ||
      review.challengerOutputSha256 !== pair.challenger.outputSha256
    )
      throw new Error(`Stale human review for ${review.briefId}`);
    const key = JSON.stringify([review.briefId, review.reviewerId]);
    if (seenReviews.has(key)) throw new Error(`Repeated reviewer for ${review.briefId}`);
    seenReviews.add(key);
    reviewByBrief.set(review.briefId, [...(reviewByBrief.get(review.briefId) ?? []), review]);
  }
  const outcomesByFamily = new Map<string, Array<"baseline" | "challenger" | "tie">>();
  let reviewedBriefs = 0;
  for (const [briefId, reviews] of reviewByBrief) {
    if (reviews.length < 2) continue;
    reviewedBriefs += 1;
    const family = pairs.get(briefId)!.baseline!.family;
    outcomesByFamily.set(family, [
      ...(outcomesByFamily.get(family) ?? []),
      consensus(reviews.map((r) => r.winner)),
    ]);
  }
  const familyOutcomes = [...outcomesByFamily.values()].map(consensus);
  const humanWins = familyOutcomes.filter((r) => r === "challenger").length;
  const humanLosses = familyOutcomes.filter((r) => r === "baseline").length;
  const humanTies = familyOutcomes.filter((r) => r === "tie").length;
  const humanInterval = wilsonInterval(humanWins, humanWins + humanLosses);
  const baseline = summarize(rows.filter((r) => r.variant === "baseline"));
  const challenger = summarize(rows.filter((r) => r.variant === "challenger"));
  const blockers: string[] = [];
  if (reviewedBriefs < bothAccepted)
    blockers.push(
      `Human reviews incomplete: ${reviewedBriefs}/${bothAccepted} paired accepted briefs`
    );
  const reviewerCount = new Set(
    [...reviewByBrief.values()].flatMap((reviews) => reviews.map((r) => r.reviewerId))
  ).size;
  if (reviewerCount < 5) blockers.push(`Human reviewer pool ${reviewerCount}/5`);
  if (pairs.size < 100) blockers.push(`Paired briefs ${pairs.size}/100`);
  for (const [tier, count] of Object.entries(tiers))
    if (count < 20) blockers.push(`${tier} briefs ${count}/20`);
  if (techniques.size < 6) blockers.push(`Techniques ${techniques.size}/6`);
  if (humanWins + humanLosses < 30)
    blockers.push(`Decisive reviewed families ${humanWins + humanLosses}/30`);
  if (!humanInterval || humanInterval[0] <= 0.5)
    blockers.push("Human family preference does not show a 95% interval above chance");
  if (challengerOnlyAccepted < baselineOnlyAccepted)
    blockers.push("Observed acceptance yield regressed");
  if (baseline.costPerAcceptedUsd === null || challenger.costPerAcceptedUsd === null)
    blockers.push("Cost per accepted puzzle is unavailable");
  else if (challenger.costPerAcceptedUsd > baseline.costPerAcceptedUsd)
    blockers.push("Cost per accepted puzzle regressed");
  if (baseline.p95DurationMs === null || challenger.p95DurationMs === null)
    blockers.push("Latency comparison is unavailable");
  else if (challenger.p95DurationMs > baseline.p95DurationMs * 1.2)
    blockers.push("p95 latency regressed by more than 20%");
  return {
    schemaVersion: 1,
    systems: Object.fromEntries(systemByVariant),
    archiveSha256: archive ?? null, evaluatorVersion: evaluator ?? null,
    baseline,
    challenger,
    pairedBriefs: pairs.size,
    tiers,
    techniqueCount: techniques.size,
    pairedAcceptance: { challengerOnlyAccepted, baselineOnlyAccepted },
    human: {
      reviewedBriefs,
      eligibleBriefs: bothAccepted,
      reviewerCount,
      reviewedFamilies: familyOutcomes.length,
      wins: humanWins,
      losses: humanLosses,
      ties: humanTies,
      decisiveFamilyWinRate: humanWins + humanLosses ? humanWins / (humanWins + humanLosses) : null,
      decisiveFamilyWinRate95CI: humanInterval,
    },
    decision: blockers.length ? "not-qualified" : "candidate-for-release-review",
    blockers,
    deploymentAllowed: false,
    limitations: [
      "This compares two systems, not every puzzle system in the world.",
      "Cost and latency guardrails use observed values, not noninferiority confidence bounds.",
      "Preference interval excludes tied families; report ties alongside it.",
      "Human reviews must be collected blind; the schema cannot verify reviewer conduct.",
      "Freeze briefs, archive, evaluators and budget before collecting results; include every failed run.",
    ],
  };
}
