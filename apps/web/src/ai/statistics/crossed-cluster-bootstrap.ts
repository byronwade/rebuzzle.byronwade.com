export const DEFAULT_CROSSED_CLUSTER_BOOTSTRAP_REPLICATES = 1_000;

export type WeightedObservation<T> = {
  observation: T;
  rowWeight: number;
  columnWeight: number;
  weight: number;
};

export type BootstrapMetricInterval = {
  observed: number;
  lower: number;
  upper: number;
};

export type CrossedClusterBootstrapResult<Metric extends string> = {
  method: "pigeonhole-bootstrap";
  confidenceLevel: 0.95;
  replicates: number;
  rowClusters: number;
  columnClusters: number;
  sufficient: boolean;
  metrics: Partial<Record<Metric, BootstrapMetricInterval>>;
};

type CrossedClusterBootstrapInput<T, Metric extends string> = {
  observations: readonly T[];
  rowCluster: (observation: T) => string;
  columnCluster: (observation: T) => string;
  statistic: (observations: readonly WeightedObservation<T>[]) => Partial<Record<Metric, number>>;
  seed: string;
  replicates?: number;
};

function hashSeed(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash === 0 ? 0x9e3779b9 : hash >>> 0;
}

function createRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
}

function sampleClusterCounts(clusters: readonly string[], random: () => number) {
  const counts = new Map<string, number>();
  for (let draw = 0; draw < clusters.length; draw += 1) {
    const cluster = clusters[Math.floor(random() * clusters.length)]!;
    counts.set(cluster, (counts.get(cluster) ?? 0) + 1);
  }
  return counts;
}

function percentile(values: readonly number[], probability: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const rank = Math.max(0, Math.min(sorted.length - 1, Math.ceil(probability * sorted.length) - 1));
  return sorted[rank]!;
}

function finiteMetrics<Metric extends string>(
  metrics: Partial<Record<Metric, number>>
): Partial<Record<Metric, number>> {
  return Object.fromEntries(
    Object.entries(metrics).filter((entry): entry is [Metric, number] => Number.isFinite(entry[1]))
  ) as Partial<Record<Metric, number>>;
}

/**
 * Deterministic two-way cluster bootstrap for crossed row/column evidence.
 *
 * Rows and columns are sampled independently with replacement and each
 * observation receives the product of its cluster multiplicities. This is the
 * pigeonhole bootstrap described by Owen for sparse, unbalanced crossed data.
 * The returned percentiles are one-sided 95% bounds. Callers should retain an
 * analytic finite-sample bound (for example Wilson) when a bootstrap can
 * degenerate at an all-zero or all-one boundary.
 */
export function crossedClusterBootstrap<T, Metric extends string>(
  input: CrossedClusterBootstrapInput<T, Metric>
): CrossedClusterBootstrapResult<Metric> {
  const rowClusters = [...new Set(input.observations.map(input.rowCluster))].sort();
  const columnClusters = [...new Set(input.observations.map(input.columnCluster))].sort();
  const replicates = Math.max(
    100,
    Math.min(10_000, Math.round(input.replicates ?? DEFAULT_CROSSED_CLUSTER_BOOTSTRAP_REPLICATES))
  );
  const observed = finiteMetrics(
    input.statistic(
      input.observations.map((observation) => ({
        observation,
        rowWeight: 1,
        columnWeight: 1,
        weight: 1,
      }))
    )
  );
  const sufficient = rowClusters.length >= 2 && columnClusters.length >= 2;
  if (!sufficient || Object.keys(observed).length === 0) {
    return {
      method: "pigeonhole-bootstrap",
      confidenceLevel: 0.95,
      replicates: 0,
      rowClusters: rowClusters.length,
      columnClusters: columnClusters.length,
      sufficient: false,
      metrics: {},
    };
  }

  const random = createRandom(input.seed);
  const samples = new Map<Metric, number[]>();
  for (const metric of Object.keys(observed) as Metric[]) samples.set(metric, []);

  for (let replicate = 0; replicate < replicates; replicate += 1) {
    const rowCounts = sampleClusterCounts(rowClusters, random);
    const columnCounts = sampleClusterCounts(columnClusters, random);
    const weighted = input.observations.flatMap((observation) => {
      const rowWeight = rowCounts.get(input.rowCluster(observation)) ?? 0;
      const columnWeight = columnCounts.get(input.columnCluster(observation)) ?? 0;
      const weight = rowWeight * columnWeight;
      return weight > 0 ? [{ observation, rowWeight, columnWeight, weight }] : [];
    });
    const metrics = finiteMetrics(input.statistic(weighted));
    for (const [metric, values] of samples) {
      const value = metrics[metric];
      if (typeof value === "number") values.push(value);
    }
  }

  const metrics = Object.fromEntries(
    [...samples].flatMap(([metric, values]) => {
      const point = observed[metric];
      if (typeof point !== "number" || values.length < Math.ceil(replicates * 0.9)) return [];
      return [
        [
          metric,
          {
            observed: point,
            lower: percentile(values, 0.05),
            upper: percentile(values, 0.95),
          },
        ],
      ];
    })
  ) as Partial<Record<Metric, BootstrapMetricInterval>>;

  return {
    method: "pigeonhole-bootstrap",
    confidenceLevel: 0.95,
    replicates,
    rowClusters: rowClusters.length,
    columnClusters: columnClusters.length,
    sufficient: Object.keys(metrics).length === Object.keys(observed).length,
    metrics,
  };
}
