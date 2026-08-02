export const QUALITY_DRIFT_CONTRACT_VERSION = "quality-slo-v1";

export type QualityDriftWindow = {
  days: number;
  qualityVotes: number;
  dislikes: number;
  unrecognizableReports: number;
  ambiguityOrUnfairReports: number;
  finalPlays: number;
  solves: number;
  abandons: number;
  generationAttempts: number;
  generationFailuresOrFallbacks: number;
};

export type QualityDriftMetricStatus =
  | "insufficient"
  | "healthy"
  | "watch"
  | "degraded"
  | "critical";

export type BinomialInterval = {
  rate: number;
  lower: number;
  upper: number;
  events: number;
  total: number;
};

export type QualityDriftMetric = {
  id: "unrecognizable" | "ambiguous_or_unfair" | "dislike" | "generation_failure";
  label: string;
  targetRate: number;
  status: QualityDriftMetricStatus;
  fast: BinomialInterval & { burnRate: number };
  slow: BinomialInterval & { burnRate: number };
  reason: string;
};

export type QualityDriftReport = {
  version: typeof QUALITY_DRIFT_CONTRACT_VERSION;
  status: "insufficient" | "healthy" | "watch" | "degraded" | "halt";
  shouldUseReserve: boolean;
  fastWindow: QualityDriftWindow;
  slowWindow: QualityDriftWindow;
  metrics: QualityDriftMetric[];
  recommendation: string;
  generatedAt: string;
};

type MetricDefinition = {
  id: QualityDriftMetric["id"];
  label: string;
  targetRate: number;
  fastMin: number;
  slowMin: number;
  fastEventMin: number;
  slowEventMin: number;
  fast: (window: QualityDriftWindow) => { events: number; total: number };
  slow: (window: QualityDriftWindow) => { events: number; total: number };
};

const METRICS: MetricDefinition[] = [
  {
    id: "unrecognizable",
    label: "Player-reported unrecognizable boards",
    targetRate: 0.01,
    fastMin: 20,
    slowMin: 50,
    fastEventMin: 3,
    slowEventMin: 5,
    fast: (window) => ({ events: window.unrecognizableReports, total: window.qualityVotes }),
    slow: (window) => ({ events: window.unrecognizableReports, total: window.qualityVotes }),
  },
  {
    id: "ambiguous_or_unfair",
    label: "Player-reported ambiguous or unfair boards",
    targetRate: 0.02,
    fastMin: 20,
    slowMin: 50,
    fastEventMin: 3,
    slowEventMin: 5,
    fast: (window) => ({
      events: window.ambiguityOrUnfairReports,
      total: window.qualityVotes,
    }),
    slow: (window) => ({
      events: window.ambiguityOrUnfairReports,
      total: window.qualityVotes,
    }),
  },
  {
    id: "dislike",
    label: "Puzzle dislikes",
    targetRate: 0.2,
    fastMin: 20,
    slowMin: 50,
    fastEventMin: 3,
    slowEventMin: 5,
    fast: (window) => ({ events: window.dislikes, total: window.qualityVotes }),
    slow: (window) => ({ events: window.dislikes, total: window.qualityVotes }),
  },
  {
    id: "generation_failure",
    label: "Generation failures or reserve fallbacks",
    targetRate: 0.05,
    fastMin: 5,
    slowMin: 14,
    fastEventMin: 2,
    slowEventMin: 3,
    fast: (window) => ({
      events: window.generationFailuresOrFallbacks,
      total: window.generationAttempts,
    }),
    slow: (window) => ({
      events: window.generationFailuresOrFallbacks,
      total: window.generationAttempts,
    }),
  },
];

function clampCount(events: number, total: number): { events: number; total: number } {
  const safeTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const safeEvents = Math.max(
    0,
    Math.min(safeTotal, Math.floor(Number.isFinite(events) ? events : 0))
  );
  return { events: safeEvents, total: safeTotal };
}

/** Wilson score interval avoids the pathological confidence of the naive Wald interval. */
export function wilsonInterval(events: number, total: number, z = 1.96): BinomialInterval {
  const safe = clampCount(events, total);
  if (!safe.total) return { rate: 0, lower: 0, upper: 1, ...safe };
  const rate = safe.events / safe.total;
  const zSquared = z * z;
  const denominator = 1 + zSquared / safe.total;
  const center = (rate + zSquared / (2 * safe.total)) / denominator;
  const margin =
    (z / denominator) *
    Math.sqrt((rate * (1 - rate)) / safe.total + zSquared / (4 * safe.total ** 2));
  return {
    rate,
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    ...safe,
  };
}

function evaluateMetric(
  definition: MetricDefinition,
  fastWindow: QualityDriftWindow,
  slowWindow: QualityDriftWindow
): QualityDriftMetric {
  const fastCounts = definition.fast(fastWindow);
  const slowCounts = definition.slow(slowWindow);
  const fast = wilsonInterval(fastCounts.events, fastCounts.total);
  const slow = wilsonInterval(slowCounts.events, slowCounts.total);
  const fastBurn = fast.rate / definition.targetRate;
  const slowBurn = slow.rate / definition.targetRate;
  const fastReady = fast.total >= definition.fastMin;
  const slowReady = slow.total >= definition.slowMin;
  const fastConfirmed =
    fastReady && fast.events >= definition.fastEventMin && fast.lower > definition.targetRate;
  const slowConfirmed =
    slowReady && slow.events >= definition.slowEventMin && slow.lower > definition.targetRate;

  let status: QualityDriftMetricStatus = "healthy";
  let reason = `${definition.label} is within its ${(definition.targetRate * 100).toFixed(0)}% SLO.`;
  if (!fastReady && !slowReady) {
    status = "insufficient";
    reason = `${definition.label} needs at least ${definition.fastMin} fast-window or ${definition.slowMin} slow-window observations.`;
  } else if (fastConfirmed && slowConfirmed && fastBurn >= 4 && slowBurn >= 2) {
    status = "critical";
    reason = `${definition.label} is a confirmed fast-and-slow breach (${fastBurn.toFixed(1)}×/${slowBurn.toFixed(1)}× budget burn).`;
  } else if (slowConfirmed || (fastConfirmed && fastBurn >= 2)) {
    status = "degraded";
    reason = `${definition.label} is statistically above target (${fastBurn.toFixed(1)}×/${slowBurn.toFixed(1)}× budget burn).`;
  } else if (
    (fastReady && fast.events >= Math.max(1, definition.fastEventMin - 1) && fastBurn >= 2) ||
    (slowReady && slow.events >= Math.max(2, definition.slowEventMin - 2) && slowBurn > 1)
  ) {
    status = "watch";
    reason = `${definition.label} is consuming quality budget, but the breach is not yet confirmed.`;
  }

  return {
    id: definition.id,
    label: definition.label,
    targetRate: definition.targetRate,
    status,
    fast: { ...fast, burnRate: fastBurn },
    slow: { ...slow, burnRate: slowBurn },
    reason,
  };
}

export function assessQualityDrift(input: {
  fastWindow: QualityDriftWindow;
  slowWindow: QualityDriftWindow;
  now?: Date;
}): QualityDriftReport {
  const metrics = METRICS.map((metric) =>
    evaluateMetric(metric, input.fastWindow, input.slowWindow)
  );
  const critical = metrics.filter((metric) => metric.status === "critical");
  const degraded = metrics.filter((metric) => metric.status === "degraded");
  const watches = metrics.filter((metric) => metric.status === "watch");
  const allInsufficient = metrics.every((metric) => metric.status === "insufficient");
  const status: QualityDriftReport["status"] = critical.length
    ? "halt"
    : degraded.length
      ? "degraded"
      : watches.length
        ? "watch"
        : allInsufficient
          ? "insufficient"
          : "healthy";
  const recommendation = critical.length
    ? `Use the validated reserve and investigate: ${critical.map((metric) => metric.label).join(", ")}.`
    : degraded.length
      ? `Hold evaluator/model promotion and review: ${degraded.map((metric) => metric.label).join(", ")}.`
      : watches.length
        ? `Continue with heightened review: ${watches.map((metric) => metric.label).join(", ")}.`
        : allInsufficient
          ? "Collect more production outcomes before making a drift claim."
          : "Quality signals are within their current SLOs.";

  return {
    version: QUALITY_DRIFT_CONTRACT_VERSION,
    status,
    shouldUseReserve: status === "halt",
    fastWindow: input.fastWindow,
    slowWindow: input.slowWindow,
    metrics,
    recommendation,
    generatedAt: (input.now ?? new Date()).toISOString(),
  };
}
