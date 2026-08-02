export type BinomialInterval = {
  rate: number;
  lower: number;
  upper: number;
  events: number;
  total: number;
};

/** Standard-normal critical value for a one-sided 95% confidence bound. */
export const ONE_SIDED_95_Z = 1.6448536269514722;

function clampCount(events: number, total: number): { events: number; total: number } {
  const safeTotal = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const safeEvents = Math.max(
    0,
    Math.min(safeTotal, Math.floor(Number.isFinite(events) ? events : 0))
  );
  return { events: safeEvents, total: safeTotal };
}

/**
 * Wilson score interval for a binomial proportion.
 *
 * Pass z=1.96 for a two-sided 95% interval or ONE_SIDED_95_Z when only the
 * lower or upper bound is used for a one-sided 95% acceptance decision.
 */
export function wilsonScoreInterval(events: number, total: number, z = 1.96): BinomialInterval {
  const safe = clampCount(events, total);
  if (!safe.total) return { rate: 0, lower: 0, upper: 1, ...safe };
  const rate = safe.events / safe.total;
  const safeZ = Number.isFinite(z) && z > 0 ? z : 1.96;
  const zSquared = safeZ * safeZ;
  const denominator = 1 + zSquared / safe.total;
  const center = (rate + zSquared / (2 * safe.total)) / denominator;
  const margin =
    (safeZ / denominator) *
    Math.sqrt((rate * (1 - rate)) / safe.total + zSquared / (4 * safe.total ** 2));
  return {
    rate,
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    ...safe,
  };
}
