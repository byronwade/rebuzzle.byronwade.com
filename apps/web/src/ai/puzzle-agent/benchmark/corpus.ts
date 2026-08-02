import { listCuratedPictogramIds, resolveCuratedPictogram } from "../visual/curated-pictograms";
import type { IconBenchmarkCase } from "./types";

const CRITICAL_COMMON_OBJECTS = new Set([
  "car",
  "key",
  "eye",
  "clock",
  "house",
  "book",
  "heart",
  "sun",
  "moon",
  "plane",
  "phone",
  "tree",
]);

/**
 * Frozen, reproducible icon benchmark:
 * - every catalog asset must be accepted for its own concept;
 * - every concept must reject a deterministic, visibly different catalog asset.
 *
 * Each specimen is evaluated at 36px and 72px, producing more than 200
 * recognition decisions without storing duplicate vector payloads.
 */
export function buildIconBenchmarkCorpus(
  options: { includeQuarantined?: boolean } = {}
): IconBenchmarkCase[] {
  const ids = listCuratedPictogramIds(options);
  const offset = Math.max(1, Math.floor(ids.length / 3));
  const positives = ids.map((concept) => {
    const asset = resolveCuratedPictogram(concept, options);
    if (!asset) throw new Error(`Missing curated benchmark asset: ${concept}`);
    return {
      id: `catalog-positive:${concept}`,
      group: "catalog-positive" as const,
      expected: "accept" as const,
      intendedConcept: concept,
      renderedConcept: concept,
      svg: asset.svg,
      critical: CRITICAL_COMMON_OBJECTS.has(concept),
    };
  });
  const negatives = ids.map((concept, index) => {
    const renderedConcept = ids[(index + offset) % ids.length]!;
    const asset = resolveCuratedPictogram(renderedConcept, options);
    if (!asset) throw new Error(`Missing negative benchmark asset: ${renderedConcept}`);
    return {
      id: `semantic-negative:${concept}:shown-${renderedConcept}`,
      group: "semantic-negative" as const,
      expected: "reject" as const,
      intendedConcept: concept,
      renderedConcept,
      svg: asset.svg,
      critical: CRITICAL_COMMON_OBJECTS.has(concept),
    };
  });
  return [...positives, ...negatives];
}
