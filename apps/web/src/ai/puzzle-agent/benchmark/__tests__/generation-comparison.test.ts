import { createHash } from "node:crypto";
import {
  type ComparisonObservation,
  type ComparisonReview,
  compareGenerators,
  wilsonInterval,
} from "../generation-comparison";

const digest = (s: string) => createHash("sha256").update(s).digest("hex");
function row(
  id: string,
  variant: "baseline" | "challenger",
  overrides: Partial<ComparisonObservation> = {}
): ComparisonObservation {
  return {
    schemaVersion: 1,
    briefId: id,
    briefSha256: digest(id),
    archiveSha256: digest("archive"),
    systemSha256: digest(variant),
    evaluatorVersion: "frozen-v1",
    family: id,
    tier: "Hard",
    technique: "positional",
    variant,
    candidateLimit: 3,
    callLimit: 20,
    candidatesUsed: 2,
    callsUsed: 10,
    costUsd: 0.5,
    durationMs: 1000,
    accepted: true,
    outputSha256: digest(`${id}:${variant}`),
    gates: {
      uniqueness: true,
      recognition: true,
      blindSolve: true,
      editorial: true,
      difficulty: true,
      hints: true,
    },
    ...overrides,
  };
}
function review(
  id: string,
  reviewerId: string,
  winner: ComparisonReview["winner"] = "challenger"
): ComparisonReview {
  return {
    briefId: id,
    reviewerId,
    winner,
    blinded: true,
    baselineOutputSha256: digest(`${id}:baseline`),
    challengerOutputSha256: digest(`${id}:challenger`),
  };
}
it("refuses to qualify absent or small evidence", () => {
  const empty = compareGenerators({ observations: [], reviews: [] });
  expect(empty.decision).toBe("not-qualified");
  expect(empty.baseline.costPerAcceptedUsd).toBeNull();
  expect(
    compareGenerators({ observations: [row("a", "baseline"), row("a", "challenger")], reviews: [] })
      .decision
  ).toBe("not-qualified");
});
it("charges failed attempts when computing cost per accepted puzzle", () => {
  const observations = [
    row("a", "baseline"),
    row("a", "challenger"),
    row("b", "baseline", { accepted: false, costUsd: 1 }),
    row("b", "challenger"),
  ];
  const output = compareGenerators({ observations, reviews: [] });
  expect(output.baseline.costPerAcceptedUsd).toBe(1.5);
  expect(output.challenger.costPerAcceptedUsd).toBe(0.5);
  expect(output.pairedAcceptance.challengerOnlyAccepted).toBe(1);
});
it("rejects missing pairs and duplicate runs instead of silently dropping failures", () => {
  expect(() => compareGenerators({ observations: [row("a", "baseline")], reviews: [] })).toThrow(
    "Unpaired"
  );
  expect(() =>
    compareGenerators({ observations: [row("a", "baseline"), row("a", "baseline")], reviews: [] })
  ).toThrow("Duplicate");
});
it.each([
  "briefSha256",
  "archiveSha256",
  "evaluatorVersion",
  "candidateLimit",
  "callLimit",
] as const)("requires equal %s across variants", (key) => {
  const changed = key.endsWith("Limit") ? 50 : key.endsWith("Sha256") ? digest("other") : "other";
  expect(() =>
    compareGenerators({
      observations: [row("a", "baseline"), row("a", "challenger", { [key]: changed })],
      reviews: [],
    })
  ).toThrow(/Unfair comparison|Archive or evaluator changed/);
});
it("rejects budget overruns and accepted puzzles that fail gates", () => {
  expect(() =>
    compareGenerators({ observations: [row("a", "baseline", { callsUsed: 30 })], reviews: [] })
  ).toThrow("Budget exceeded");
  expect(() =>
    compareGenerators({
      observations: [
        row("a", "baseline", { gates: { ...row("a", "baseline").gates, recognition: false } }),
      ],
      reviews: [],
    })
  ).toThrow("failed a gate");
});
it("requires distinct blinded reviewers and current output hashes", () => {
  const observations = [row("a", "baseline"), row("a", "challenger")];
  expect(() =>
    compareGenerators({ observations, reviews: [review("a", "one"), review("a", "one")] })
  ).toThrow("Repeated reviewer");
  expect(() =>
    compareGenerators({ observations, reviews: [{ ...review("a", "one"), blinded: false }] })
  ).toThrow();
  expect(() =>
    compareGenerators({
      observations,
      reviews: [{ ...review("a", "one"), challengerOutputSha256: digest("stale") }],
    })
  ).toThrow("Stale");
});
it("does not inflate independent evidence with many variants from one family", () => {
  const observations: ComparisonObservation[] = [];
  const reviews: ComparisonReview[] = [];
  for (let i = 0; i < 40; i++) {
    const id = String(i);
    observations.push(
      row(id, "baseline", { family: "same-family" }),
      row(id, "challenger", { family: "same-family" })
    );
    reviews.push(review(id, "one"), review(id, "two"));
  }
  const output = compareGenerators({ observations, reviews });
  expect(output.human.reviewedBriefs).toBe(40);
  expect(output.human.reviewedFamilies).toBe(1);
  expect(output.human.decisiveFamilyWinRate95CI![0]).toBeLessThan(0.5);
  expect(output.decision).toBe("not-qualified");
});
it("keeps tied families visible without counting them as wins", () => {
  const observations = [row("a", "baseline"), row("a", "challenger")];
  const output = compareGenerators({
    observations,
    reviews: [review("a", "one", "baseline"), review("a", "two", "challenger")],
  });
  expect(output.human.ties).toBe(1);
  expect(output.human.wins).toBe(0);
  expect(output.human.decisiveFamilyWinRate95CI).toBeNull();
});
it("rejects reused accepted puzzles within one variant", () => {
  expect(() =>
    compareGenerators({
      observations: [
        row("a", "baseline"),
        row("b", "baseline", { outputSha256: digest("a:baseline") }),
      ],
      reviews: [],
    })
  ).toThrow("Repeated accepted");
});
it("requires complete human review coverage before qualifying", () => {
  const observations = [row("a", "baseline"), row("a", "challenger")];
  expect(compareGenerators({ observations, reviews: [review("a", "one")] }).blockers).toContain(
    "Human reviews incomplete: 0/1 paired accepted briefs"
  );
});
it("qualifies strong, diverse evidence only for release review, never deployment", () => {
  const observations: ComparisonObservation[] = [];
  const reviews: ComparisonReview[] = [];
  const tiers = ["Hard", "Difficult", "Evil", "Impossible"] as const;
  for (let i = 0; i < 100; i++) {
    const id = String(i);
    const shared = { tier: tiers[i % 4]!, technique: `mechanism-${i % 6}` };
    observations.push(row(id, "baseline", shared), row(id, "challenger", shared));
    reviews.push(review(id, `r${i % 5}`), review(id, `r${(i + 1) % 5}`));
  }
  const output = compareGenerators({ observations, reviews });
  expect(output.decision).toBe("candidate-for-release-review");
  expect(output.deploymentAllowed).toBe(false);
  expect(output.human.decisiveFamilyWinRate95CI![0]).toBeGreaterThan(0.5);
});
it("bounds a chance-level confidence interval around one half", () => {
  const interval = wilsonInterval(50, 100)!;
  expect(interval[0]).toBeLessThan(0.5);
  expect(interval[1]).toBeGreaterThan(0.5);
});

it("rejects changing system versions or repeated briefs within an experiment", () => {
  expect(() =>
    compareGenerators({
      observations: [
        row("a", "baseline"),
        row("a", "challenger"),
        row("b", "baseline", { systemSha256: digest("changed") }),
      ],
      reviews: [],
    })
  ).toThrow("System changed");
  expect(() =>
    compareGenerators({
      observations: [
        row("a", "baseline"),
        row("a", "challenger"),
        row("b", "baseline", { briefSha256: digest("a") }),
        row("b", "challenger", { briefSha256: digest("a") }),
      ],
      reviews: [],
    })
  ).toThrow("Repeated brief");
});
