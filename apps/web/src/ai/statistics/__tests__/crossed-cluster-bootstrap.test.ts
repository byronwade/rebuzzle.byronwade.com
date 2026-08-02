import { crossedClusterBootstrap } from "../crossed-cluster-bootstrap";

type Observation = {
  reviewer: string;
  puzzle: string;
  correct: boolean;
};

function solveRate(rows: readonly { observation: Observation; weight: number }[]) {
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  const correct = rows.reduce((sum, row) => sum + (row.observation.correct ? row.weight : 0), 0);
  return { solveRate: total > 0 ? correct / total : Number.NaN };
}

const observations: Observation[] = [
  { reviewer: "r1", puzzle: "p1", correct: true },
  { reviewer: "r1", puzzle: "p2", correct: true },
  { reviewer: "r2", puzzle: "p1", correct: false },
  { reviewer: "r2", puzzle: "p2", correct: false },
  { reviewer: "r3", puzzle: "p1", correct: true },
  { reviewer: "r3", puzzle: "p2", correct: true },
];

describe("crossedClusterBootstrap", () => {
  it("is deterministic and reports one-sided crossed-cluster bounds", () => {
    const run = () =>
      crossedClusterBootstrap({
        observations,
        rowCluster: (row) => row.reviewer,
        columnCluster: (row) => row.puzzle,
        statistic: solveRate,
        seed: "fixed-evidence-contract",
        replicates: 500,
      });

    const first = run();
    expect(run()).toEqual(first);
    expect(first).toMatchObject({
      method: "pigeonhole-bootstrap",
      confidenceLevel: 0.95,
      replicates: 500,
      rowClusters: 3,
      columnClusters: 2,
      sufficient: true,
    });
    expect(first.metrics.solveRate?.observed).toBeCloseTo(2 / 3);
    expect(first.metrics.solveRate?.lower).toBeLessThan(2 / 3);
    expect(first.metrics.solveRate?.upper).toBe(1);
  });

  it("refuses to manufacture cluster uncertainty from one reviewer", () => {
    const result = crossedClusterBootstrap({
      observations: observations.filter((row) => row.reviewer === "r1"),
      rowCluster: (row) => row.reviewer,
      columnCluster: (row) => row.puzzle,
      statistic: solveRate,
      seed: "one-reviewer",
    });

    expect(result).toMatchObject({
      replicates: 0,
      rowClusters: 1,
      columnClusters: 2,
      sufficient: false,
      metrics: {},
    });
  });

  it("keeps perfect empirical evidence deterministic without claiming analytic safety", () => {
    const result = crossedClusterBootstrap({
      observations: observations.map((row) => ({ ...row, correct: true })),
      rowCluster: (row) => row.reviewer,
      columnCluster: (row) => row.puzzle,
      statistic: solveRate,
      seed: "perfect",
      replicates: 200,
    });

    expect(result.metrics.solveRate).toEqual({ observed: 1, lower: 1, upper: 1 });
  });

  it("preserves reviewer-level correlation instead of counting repeated judgments as independent", () => {
    const correlated = Array.from({ length: 4 }, (_, reviewerIndex) =>
      Array.from({ length: 4 }, (_, puzzleIndex) => ({
        reviewer: `r${reviewerIndex}`,
        puzzle: `p${puzzleIndex}`,
        correct: reviewerIndex === 0,
      }))
    ).flat();
    const result = crossedClusterBootstrap({
      observations: correlated,
      rowCluster: (row) => row.reviewer,
      columnCluster: (row) => row.puzzle,
      statistic: solveRate,
      seed: "reviewer-correlated",
      replicates: 1_000,
    });

    expect(result.metrics.solveRate?.observed).toBe(0.25);
    expect(result.metrics.solveRate?.upper).toBeGreaterThanOrEqual(0.75);
  });
});
