import { createHash } from "node:crypto";
import { z } from "zod";
import { blueprintDigest, type CandidateRecord, CandidateRecordSchema } from "./candidate-record";

const identity = z.string().trim().min(1).max(200);
export const TrainingReviewSchema = z.object({
  candidateId: identity,
  digest: z.string().length(64),
  decision: z.enum(["approve", "reject"]),
  rights: z.enum(["approved", "rejected", "pending"]),
  rightsEvidence: identity,
  reviewer: identity,
  reviewedAt: z.string().datetime(),
  aliases: z.array(identity).max(20).default([]),
});
export const PreferenceReviewSchema = z.object({
  chosenId: identity,
  rejectedId: identity,
  chosenDigest: z.string().length(64),
  rejectedDigest: z.string().length(64),
  reviewer: identity,
  reviewedAt: z.string().datetime(),
  reason: identity,
});
export type TrainingReview = z.infer<typeof TrainingReviewSchema>;
export type PreferenceReview = z.infer<typeof PreferenceReviewSchema>;
export type DatasetSplit = "train" | "validation" | "test";

export function answerKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const SYSTEM =
  "Design a fair, original rebus puzzle. Return the JSON blueprint only: answer, explanation, category, difficulty, techniqueId, hints, and visual (layout, unicodeFallback, layers). Use visible clues, a unique answer and progressive hints. Assets are resolved by the host; do not emit SVG, URLs or image bytes.";
function prompt(record: CandidateRecord) {
  const { answer, category, difficulty, techniqueId } = record.blueprint;
  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: JSON.stringify({ answerSeed: answer, category, difficulty, techniqueId }),
    },
  ];
}

/** Fixed bounded features; human preferences provide the labels, never model scores. */
export const RANKER_FEATURES = [
  "quality",
  "fun",
  "uniqueness",
  "blindAgreement",
  "wrongConfidence",
  "publishable",
  "rejectionCount",
] as const;
export function rankerFeatures(record: CandidateRecord): number[] {
  const e = record.evaluation;
  return [
    e.quality / 100,
    e.fun / 100,
    e.uniqueness / 100,
    e.blindRequiredVotes > 0 ? Math.min(1, e.blindTopVotes / e.blindRequiredVotes) : 0,
    e.strongestWrongConfidence,
    Number(e.publishable),
    Math.min(10, e.rejectReasons.length) / 10,
  ];
}

/** Pure offline preparation. External benchmarks are excluded, not mined for examples. */
export function prepareTrainingDataset(input: {
  candidates: unknown[];
  reviews: unknown[];
  preferences: unknown[];
  benchmarkAnswers: string[];
}) {
  const records = input.candidates.map((value) => CandidateRecordSchema.parse(value));
  const byId = new Map<string, CandidateRecord>();
  for (const record of records) {
    if (byId.has(record.id)) throw new Error(`Duplicate candidate id ${record.id}`);
    if (blueprintDigest(record.blueprint) !== record.digest)
      throw new Error(`Candidate digest mismatch: ${record.id}`);
    byId.set(record.id, record);
  }
  const reviews = input.reviews.map((value) => TrainingReviewSchema.parse(value));
  const byReview = new Map<string, TrainingReview>();
  for (const review of reviews) {
    if (byReview.has(review.candidateId)) throw new Error(`Duplicate review ${review.candidateId}`);
    const record = byId.get(review.candidateId);
    if (!record || record.digest !== review.digest)
      throw new Error(`Stale or unknown review: ${review.candidateId}`);
    byReview.set(review.candidateId, review);
  }

  // Connected components keep answer variants, identical boards and whole mechanism
  // families together. Use every record, even unreviewed ones, to connect variants.
  const parent = new Map(records.map((record) => [record.id, record.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let current = id;
    while (current !== root) {
      const next = parent.get(current)!;
      parent.set(current, root);
      current = next;
    }
    return root;
  };
  const keys = new Map<string, string>();
  for (const record of [...records].sort((a, b) => a.id.localeCompare(b.id))) {
    const tokens = [
      `family:${record.familyKey}`,
      `board:${hash(JSON.stringify(record.blueprint.visual))}`,
      ...[record.blueprint.answer, ...(byReview.get(record.id)?.aliases ?? [])].map(
        (a) => `answer:${answerKey(a)}`
      ),
    ];
    for (const token of tokens) {
      const prior = keys.get(token);
      if (prior) {
        const a = find(record.id);
        const b = find(prior);
        parent.set(a < b ? b : a, a < b ? a : b);
      } else keys.set(token, record.id);
    }
  }
  const grouped = new Map<string, CandidateRecord[]>();
  for (const record of records) {
    const root = find(record.id);
    grouped.set(root, [...(grouped.get(root) ?? []), record]);
  }
  const splitById = new Map<string, DatasetSplit>();
  const groupById = new Map<string, string>();
  const blocked = new Set<string>();
  const benchmarkKeys = new Set(input.benchmarkAnswers.map(answerKey));
  for (const group of grouped.values()) {
    const groupKey = hash(
      group
        .map((r) => r.digest)
        .sort()
        .join("\n")
    );
    const bucket = Number.parseInt(groupKey.slice(0, 8), 16) % 100;
    const split: DatasetSplit = bucket < 80 ? "train" : bucket < 90 ? "validation" : "test";
    const contaminated = group.some((r) =>
      [r.blueprint.answer, ...(byReview.get(r.id)?.aliases ?? [])].some((a) =>
        benchmarkKeys.has(answerKey(a))
      )
    );
    for (const record of group) {
      splitById.set(record.id, split);
      groupById.set(record.id, groupKey);
      if (contaminated) blocked.add(record.id);
    }
  }
  const rightsReady = (record: CandidateRecord) =>
    byReview.get(record.id)?.rights === "approved" && !blocked.has(record.id);
  const approved = records.filter(
    (r) =>
      rightsReady(r) &&
      byReview.get(r.id)?.decision === "approve" &&
      r.evaluation.publishable &&
      r.evaluation.rejectReasons.length === 0 &&
      r.evaluation.blindRequiredVotes >= 2 &&
      r.evaluation.blindTopVotes >= r.evaluation.blindRequiredVotes
  );
  const approvedIds = new Set(approved.map((r) => r.id));
  const buckets = () => ({
    train: [] as object[],
    validation: [] as object[],
    test: [] as object[],
  });
  const sft = buckets();
  const dpo = buckets();
  const ranker = buckets();
  const seenSft = new Set<string>();
  for (const record of approved) {
    if (seenSft.has(record.digest)) continue;
    seenSft.add(record.digest);
    sft[splitById.get(record.id)!].push({
      messages: [
        ...prompt(record),
        { role: "assistant", content: JSON.stringify(record.blueprint) },
      ],
    });
  }
  const pairGroups = {
    train: new Set<string>(),
    validation: new Set<string>(),
    test: new Set<string>(),
  };
  const skippedPairs: string[] = [];
  const seenPairs = new Set<string>();
  for (const raw of input.preferences) {
    const pair = PreferenceReviewSchema.parse(raw);
    const chosen = byId.get(pair.chosenId);
    const rejected = byId.get(pair.rejectedId);
    if (
      !chosen ||
      !rejected ||
      chosen.digest !== pair.chosenDigest ||
      rejected.digest !== pair.rejectedDigest
    )
      throw new Error("Stale or unknown preference review");
    if (chosen.digest === rejected.digest)
      throw new Error("Preference cannot compare identical candidates");
    const pairKey = [chosen.digest, rejected.digest].sort().join(":");
    if (seenPairs.has(pairKey)) throw new Error("Duplicate or contradictory preference pair");
    seenPairs.add(pairKey);
    const split = splitById.get(chosen.id)!;
    if (
      !approvedIds.has(chosen.id) ||
      !rightsReady(rejected) ||
      splitById.get(rejected.id) !== split
    ) {
      skippedPairs.push(pairKey);
      continue;
    }
    ranker[split].push({
      chosen: rankerFeatures(chosen),
      rejected: rankerFeatures(rejected),
      group: groupById.get(chosen.id),
    });
    pairGroups[split].add(groupById.get(chosen.id)!);
    if (JSON.stringify(prompt(chosen)) === JSON.stringify(prompt(rejected))) {
      dpo[split].push({
        input: { messages: prompt(chosen) },
        preferred_output: [{ role: "assistant", content: JSON.stringify(chosen.blueprint) }],
        non_preferred_output: [{ role: "assistant", content: JSON.stringify(rejected.blueprint) }],
      });
    }
  }
  const count = (b: ReturnType<typeof buckets>) => ({
    train: b.train.length,
    validation: b.validation.length,
    test: b.test.length,
  });
  const sftCounts = count(sft);
  const pairCounts = count(ranker);
  const blockers = [
    ...(pairGroups.train.size < 10
      ? ["Need at least 10 independent training preference groups"]
      : []),
    ...(sftCounts.train < 100 ? [`Reviewed SFT train examples ${sftCounts.train}/100`] : []),
    ...(sftCounts.validation < 20 || sftCounts.test < 20
      ? ["Need at least 20 reviewed validation and test examples each"]
      : []),
    ...(pairCounts.train < 100 ? [`Human preference train pairs ${pairCounts.train}/100`] : []),
    ...(pairGroups.validation.size < 10 || pairGroups.test.size < 10
      ? ["Need at least 10 independent validation and test preference groups each"]
      : []),
  ];
  return {
    sft,
    dpo,
    ranker,
    report: {
      schemaVersion: 1,
      candidateCount: records.length,
      reviewedCount: reviews.length,
      benchmarkExcluded: blocked.size,
      independentGroups: grouped.size,
      sft: sftCounts,
      dpo: count(dpo),
      ranker: pairCounts,
      preferenceGroups: {
        train: pairGroups.train.size,
        validation: pairGroups.validation.size,
        test: pairGroups.test.size,
      },
      skippedPairs: skippedPairs.length,
      readyForTraining: blockers.length === 0,
      blockers,
      datasetDigest: hash(
        JSON.stringify({
          records,
          reviews,
          preferences: input.preferences,
          benchmarkAnswers: [...benchmarkKeys].sort(),
        })
      ),
      splitManifest: records.map((r) => ({
        id: r.id,
        digest: r.digest,
        group: groupById.get(r.id),
        split: splitById.get(r.id),
        benchmarkExcluded: blocked.has(r.id),
      })),
      featureNames: RANKER_FEATURES,
    },
  };
}
