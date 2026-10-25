import type { ApexCandidate } from "../../puzzle-agent/apex/types";
import { blueprintDigest, type CandidateRecord, snapshotCandidate } from "../candidate-record";
import { prepareTrainingDataset, type TrainingReview } from "../prepare-dataset";

function record(id: string, overrides: Partial<CandidateRecord> = {}): CandidateRecord {
  const blueprint = {
    answer: `original phrase ${id}`,
    explanation: "A visible relationship encodes the phrase.",
    category: "phrases",
    difficulty: 7,
    techniqueId: "positional_phrase",
    hints: ["Look at the positions.", "One word is above the other."],
    visual: {
      layout: "stack" as const,
      unicodeFallback: `MIND ${id} MATTER`,
      layers: [
        { kind: "text" as const, content: `MIND ${id}` },
        { kind: "text" as const, content: "MATTER" },
      ],
    },
  };
  const value = {
    schemaVersion: 1 as const,
    id,
    runId: "run",
    capturedAt: "2026-10-25T00:00:00.000Z",
    source: "rebuzzle-generated" as const,
    blueprint,
    digest: blueprintDigest(blueprint),
    familyKey: id,
    selected: true,
    evaluation: {
      publishable: true,
      rejectReasons: [],
      quality: 90,
      fun: 80,
      uniqueness: 90,
      blindTopVotes: 2,
      blindRequiredVotes: 2,
      strongestWrongConfidence: 0.1,
    },
    ...overrides,
  };
  value.digest = blueprintDigest(value.blueprint);
  return value;
}
function review(r: CandidateRecord, overrides: Partial<TrainingReview> = {}): TrainingReview {
  return {
    candidateId: r.id,
    digest: r.digest,
    decision: "approve",
    rights: "approved",
    rightsEvidence: "Original composition and reviewed catalog assets",
    reviewer: "editor",
    reviewedAt: "2026-10-25T00:00:00.000Z",
    aliases: [],
    ...overrides,
  };
}
const build = (
  candidates: CandidateRecord[],
  reviews: unknown[] = [],
  preferences: unknown[] = [],
  benchmarkAnswers: string[] = []
) => prepareTrainingDataset({ candidates, reviews, preferences, benchmarkAnswers });
const total = (b: { train: object[]; validation: object[]; test: object[] }) =>
  b.train.length + b.validation.length + b.test.length;

it("never turns selection or AI scores into human approval", () => {
  const output = build([record("a")]);
  expect(total(output.sft)).toBe(0);
  expect(output.report.readyForTraining).toBe(false);
});
it("exports only reviewed, rights-approved publishable targets", () => {
  const a = record("a");
  const b = record("b");
  const c = record("c", { evaluation: { ...a.evaluation, publishable: false } });
  expect(
    total(build([a, b, c], [review(a), review(b, { rights: "pending" }), review(c)]).sft)
  ).toBe(1);
});
it("rejects stale reviews and modified candidate payloads", () => {
  const a = record("a");
  expect(() => build([a], [review(a, { digest: "0".repeat(64) })])).toThrow("Stale");
  expect(() => build([{ ...a, digest: "0".repeat(64) }])).toThrow("digest mismatch");
});
it("groups alias chains and mechanism families transitively", () => {
  const a = record("a");
  const b = record("b");
  const c = record("c", { familyKey: b.familyKey });
  const out = build(
    [a, b, c],
    [review(a, { aliases: [b.blueprint.answer] }), review(b), review(c)]
  );
  expect(new Set(out.report.splitManifest.map((r) => r.group)).size).toBe(1);
  expect(new Set(out.report.splitManifest.map((r) => r.split)).size).toBe(1);
});
it("excludes the whole connected family when a benchmark answer overlaps", () => {
  const a = record("a");
  const b = record("b", { familyKey: a.familyKey });
  const out = build([a, b], [review(a), review(b)], [], [a.blueprint.answer.toUpperCase()]);
  expect(out.report.benchmarkExcluded).toBe(2);
  expect(total(out.sft)).toBe(0);
});
it("deduplicates identical targets and keeps duplicate boards together", () => {
  const a = record("a");
  const b = record("b", { blueprint: a.blueprint });
  expect(total(build([a, b], [review(a), review(b)]).sft)).toBe(1);
});
it("requires explicit preference reviews and keeps labels out of features", () => {
  const a = record("a");
  const b = record("b", {
    familyKey: a.familyKey,
    selected: false,
    blueprint: { ...record("b").blueprint, answer: a.blueprint.answer },
  });
  const out = build(
    [a, b],
    [review(a), review(b, { decision: "reject" })],
    [
      {
        chosenId: a.id,
        rejectedId: b.id,
        chosenDigest: a.digest,
        rejectedDigest: b.digest,
        reviewer: "editor",
        reviewedAt: "2026-10-25T00:00:00.000Z",
        reason: "The first has a clearer clue mapping",
      },
    ]
  );
  expect(total(out.ranker)).toBe(1);
  expect(total(out.dpo)).toBe(1);
  const row = [...out.ranker.train, ...out.ranker.validation, ...out.ranker.test][0] as {
    chosen: number[];
    rejected: number[];
  };
  expect(row.chosen).toEqual(row.rejected); // selected/decision are not model features
});
it("does not create DPO pairs with different generation requests", () => {
  const a = record("a");
  const b = record("b", {
    blueprint: { ...record("b").blueprint, difficulty: 8 },
    familyKey: a.familyKey,
  });
  const out = build(
    [a, b],
    [review(a), review(b)],
    [
      {
        chosenId: a.id,
        rejectedId: b.id,
        chosenDigest: a.digest,
        rejectedDigest: b.digest,
        reviewer: "editor",
        reviewedAt: "2026-10-25T00:00:00.000Z",
        reason: "Clearer",
      },
    ]
  );
  expect(total(out.ranker)).toBe(1);
  expect(total(out.dpo)).toBe(0);
});
it("is deterministic under candidate input reordering", () => {
  const a = record("a");
  const b = record("b");
  const splits = (records: CandidateRecord[]) =>
    build(records).report.splitManifest.sort((x, y) => x.id.localeCompare(y.id));
  expect(splits([a, b])).toEqual(splits([b, a]));
});
it("rejects external records even when marked approved", () => {
  expect(() =>
    prepareTrainingDataset({
      candidates: [{ ...record("a"), source: "external-benchmark" }],
      reviews: [],
      preferences: [],
      benchmarkAnswers: [],
    })
  ).toThrow();
});
it("captures a portable blueprint without assets, URLs or arbitrary metadata", () => {
  const a = record("a");
  const candidate = {
    ...a.blueprint,
    id: "a",
    qualityOverall: 90,
    funScore: 80,
    uniquenessScore: 90,
    publishable: true,
    rejectReasons: [],
    visual: {
      ...a.blueprint.visual,
      layers: [
        {
          kind: "pictogram",
          concept: "eye",
          svg: "SECRET_SVG",
          src: "SECRET_URL",
          emojiFallback: "👁️",
        },
      ],
    },
  } as unknown as ApexCandidate;
  const out = JSON.stringify(snapshotCandidate(candidate, "run", true));
  expect(out).not.toContain("SECRET");
  expect(out).toContain('"concept":"eye"');
});

it("does not promote an untested draft just because its initial quality score passed", () => {
  const base = record("draft");
  const draft = record("draft", {
    evaluation: { ...base.evaluation, blindTopVotes: 0, blindRequiredVotes: 0 },
  });
  expect(total(build([draft], [review(draft)]).sft)).toBe(0);
});
