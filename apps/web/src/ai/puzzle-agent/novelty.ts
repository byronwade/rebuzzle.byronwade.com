import { createHash } from "node:crypto";
import type { PuzzleVisual, VisualLayer } from "./visual/composition";
import { resolveCuratedPictogram } from "./visual/curated-pictograms";

export const PUZZLE_NOVELTY_VERSION = "structural-v1";

export type PuzzleNoveltyCandidate = {
  answer: string;
  category: string;
  techniqueId?: string;
  rebusPuzzle?: string;
  visual?: PuzzleVisual;
};

export type PuzzleNoveltyArchiveEntry = PuzzleNoveltyCandidate & {
  id: string;
  createdAt: Date;
  active?: boolean;
};

export type PuzzleNoveltySignature = {
  version: typeof PUZZLE_NOVELTY_VERSION;
  fingerprint: string;
  answerKey: string;
  mechanismFamilyKey: string;
  mechanismKey: string;
  topologyKey: string;
  cueCombinationKey: string;
  orderedCueKey: string;
  techniqueId: string;
  layout: string;
  cueTokens: string[];
  orderedCueTokens: string[];
  topologyTokens: string[];
};

export type PuzzleNoveltyConflict = {
  puzzleId: string;
  structuralSimilarity: number;
  answerSimilarity: number;
  cueSimilarity: number;
  orderedCueSimilarity: number;
  sameMechanism: boolean;
  sameTopology: boolean;
  reasons: string[];
};

export type PuzzleNoveltyEvidence = {
  version: typeof PUZZLE_NOVELTY_VERSION;
  fingerprint: string;
  answerKey: string;
  mechanismFamilyKey: string;
  mechanismKey: string;
  topologyKey: string;
  cueCombinationKey: string;
  orderedCueKey: string;
  cueTokens: string[];
  score: number;
  closestStructuralSimilarity: number;
  recentMechanismFamilyUses: number;
  recentTopologyUses: number;
  lookbackDays: number;
};

export type PuzzleNoveltyAssessment = {
  isUnique: boolean;
  score: number;
  signature: PuzzleNoveltySignature;
  evidence: PuzzleNoveltyEvidence;
  blockers: string[];
  recommendations: string[];
  conflicts: PuzzleNoveltyConflict[];
};

export type PuzzleNoveltyArchive = {
  findExactAnswer(answerKey: string, rawAnswer: string): Promise<PuzzleNoveltyArchiveEntry | null>;
  listRecent(since: Date, limit: number): Promise<PuzzleNoveltyArchiveEntry[]>;
};

export type PuzzleNoveltyPolicy = {
  lookbackDays: number;
  familyWindowDays: number;
  maxMechanismFamilyUses: number;
  maxTopologyUses: number;
  structuralSimilarityLimit: number;
  archiveLimit: number;
};

const DEFAULT_POLICY: PuzzleNoveltyPolicy = {
  lookbackDays: 90,
  familyWindowDays: 7,
  maxMechanismFamilyUses: 2,
  maxTopologyUses: 3,
  structuralSimilarityLimit: 0.88,
  archiveLimit: 500,
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function pictogramConcept(concept: string): string {
  return resolveCuratedPictogram(concept)?.canonicalConcept ?? (normalize(concept) || "unknown");
}

function layerCueToken(layer: VisualLayer): string {
  switch (layer.kind) {
    case "pictogram":
      return `pic:${pictogramConcept(layer.concept)}`;
    case "text":
      return `text:${normalize(layer.content)}:${layer.emphasis}`;
    case "operator":
      return `op:${layer.symbol.trim()}`;
    case "image":
      return `image:${normalize(layer.alt) || "scene"}`;
  }
}

function layerTopologyToken(layer: VisualLayer): string {
  switch (layer.kind) {
    case "pictogram":
      return "pictogram";
    case "text":
      return `text:${layer.emphasis}`;
    case "operator":
      return `operator:${layer.symbol.trim()}`;
    case "image":
      return "image";
  }
}

function legacyCueTokens(display: string): string[] {
  return (display.match(/[\p{Extended_Pictographic}]|[a-zA-Z]+|\d+|[+\-×÷=]/gu) ?? []).map(
    (token) => (/^[a-zA-Z0-9]+$/.test(token) ? `legacy:${normalize(token)}` : `legacy:${token}`)
  );
}

export function buildPuzzleNoveltySignature(
  candidate: PuzzleNoveltyCandidate
): PuzzleNoveltySignature {
  const answerKey = normalize(candidate.answer).replaceAll("-", "");
  const techniqueId = normalize(candidate.techniqueId ?? "unknown") || "unknown";
  const visualLayers = Array.isArray(candidate.visual?.layers) ? candidate.visual.layers : [];
  const layout = visualLayers.length ? (candidate.visual?.layout ?? "row") : "legacy";
  const orderedCueTokens = visualLayers.length
    ? visualLayers.map(layerCueToken)
    : legacyCueTokens(candidate.rebusPuzzle ?? "");
  const topologyTokens = visualLayers.length
    ? visualLayers.map(layerTopologyToken)
    : orderedCueTokens.map((token) => token.split(":", 1)[0] ?? "legacy");
  const cueTokens = Array.from(new Set(orderedCueTokens)).sort();
  const mechanismFamily = `${techniqueId}|${layout}`;
  const mechanism = `${mechanismFamily}|${topologyTokens.join(">")}`;
  const topology = `${layout}|${topologyTokens.join(">")}`;
  const cueCombination = cueTokens.join("|");
  const orderedCues = orderedCueTokens.join(">");
  const fingerprintSource = [
    PUZZLE_NOVELTY_VERSION,
    answerKey,
    normalize(candidate.category),
    mechanism,
    cueCombination,
    orderedCues,
  ].join("::");

  return {
    version: PUZZLE_NOVELTY_VERSION,
    fingerprint: hash(fingerprintSource),
    answerKey,
    mechanismFamilyKey: hash(mechanismFamily),
    mechanismKey: hash(mechanism),
    topologyKey: hash(topology),
    cueCombinationKey: hash(cueCombination),
    orderedCueKey: hash(orderedCues),
    techniqueId,
    layout,
    cueTokens,
    orderedCueTokens,
    topologyTokens,
  };
}

function levenshteinSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left.length || !right.length) return 0;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0]!;
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex]!;
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previous[rightIndex] = Math.min(
        previous[rightIndex]! + 1,
        previous[rightIndex - 1]! + 1,
        diagonal + cost
      );
      diagonal = above;
    }
  }
  return 1 - previous[right.length]! / Math.max(left.length, right.length);
}

function jaccard(left: string[], right: string[]): number {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const union = new Set([...leftSet, ...rightSet]);
  if (!union.size) return 0;
  let intersection = 0;
  for (const value of leftSet) if (rightSet.has(value)) intersection += 1;
  return intersection / union.size;
}

function orderedSimilarity(left: string[], right: string[]): number {
  if (!left.length || !right.length) return 0;
  const rows = Array.from({ length: left.length + 1 }, () =>
    Array.from({ length: right.length + 1 }, () => 0)
  );
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      rows[i]![j] =
        left[i - 1] === right[j - 1]
          ? rows[i - 1]![j - 1]! + 1
          : Math.max(rows[i - 1]![j]!, rows[i]![j - 1]!);
    }
  }
  return rows[left.length]![right.length]! / Math.max(left.length, right.length);
}

function compareSignatures(
  candidate: PuzzleNoveltySignature,
  existing: PuzzleNoveltySignature,
  puzzleId: string
): PuzzleNoveltyConflict {
  const answerSimilarity = levenshteinSimilarity(candidate.answerKey, existing.answerKey);
  const cueSimilarity = jaccard(candidate.cueTokens, existing.cueTokens);
  const orderedCueSimilarity = orderedSimilarity(
    candidate.orderedCueTokens,
    existing.orderedCueTokens
  );
  const topologySimilarity = orderedSimilarity(candidate.topologyTokens, existing.topologyTokens);
  const sameMechanism = candidate.mechanismKey === existing.mechanismKey;
  const sameTopology = candidate.topologyKey === existing.topologyKey;
  const techniqueSimilarity = candidate.techniqueId === existing.techniqueId ? 1 : 0;
  const structuralSimilarity =
    cueSimilarity * 0.36 +
    orderedCueSimilarity * 0.28 +
    topologySimilarity * 0.2 +
    techniqueSimilarity * 0.16;
  const reasons = [
    ...(candidate.fingerprint === existing.fingerprint ? ["exact fingerprint"] : []),
    ...(sameMechanism && candidate.orderedCueKey === existing.orderedCueKey
      ? ["same mechanism and ordered cues"]
      : []),
    ...(sameTopology &&
    candidate.cueCombinationKey === existing.cueCombinationKey &&
    candidate.orderedCueKey === existing.orderedCueKey
      ? ["same topology and ordered cue combination"]
      : []),
  ];
  return {
    puzzleId,
    structuralSimilarity,
    answerSimilarity,
    cueSimilarity,
    orderedCueSimilarity,
    sameMechanism,
    sameTopology,
    reasons,
  };
}

export function createPuzzleNoveltyModule(input: {
  archive: PuzzleNoveltyArchive;
  now?: () => Date;
  policy?: Partial<PuzzleNoveltyPolicy>;
}): {
  evaluate(candidate: PuzzleNoveltyCandidate): Promise<PuzzleNoveltyAssessment>;
} {
  const policy = { ...DEFAULT_POLICY, ...input.policy };
  const now = input.now ?? (() => new Date());

  return {
    async evaluate(candidate) {
      const signature = buildPuzzleNoveltySignature(candidate);
      const current = now();
      const lookback = new Date(current);
      lookback.setUTCDate(lookback.getUTCDate() - policy.lookbackDays);
      const familyWindow = new Date(current);
      familyWindow.setUTCDate(familyWindow.getUTCDate() - policy.familyWindowDays);
      const [exactAnswer, recent] = await Promise.all([
        input.archive.findExactAnswer(signature.answerKey, candidate.answer),
        input.archive.listRecent(lookback, policy.archiveLimit),
      ]);
      const recentWithSignatures = recent.map((entry) => ({
        entry,
        signature: buildPuzzleNoveltySignature(entry),
      }));
      const comparisons = recentWithSignatures
        .map(({ entry, signature: existingSignature }) =>
          compareSignatures(signature, existingSignature, entry.id)
        )
        .sort((left, right) => right.structuralSimilarity - left.structuralSimilarity);
      const recentFamilyUses = recentWithSignatures.filter(
        ({ entry, signature: existingSignature }) =>
          entry.createdAt >= familyWindow &&
          existingSignature.mechanismFamilyKey === signature.mechanismFamilyKey
      ).length;
      const recentTopologyUses = recentWithSignatures.filter(
        ({ entry, signature: existingSignature }) =>
          entry.createdAt >= familyWindow && existingSignature.topologyKey === signature.topologyKey
      ).length;
      const exactComposition = comparisons.find((comparison) => comparison.reasons.length > 0);
      const tooSimilar = comparisons.find(
        (comparison) => comparison.structuralSimilarity >= policy.structuralSimilarityLimit
      );
      const blockers = Array.from(
        new Set([
          ...(exactAnswer ? [`Answer already exists in the archive (${exactAnswer.id})`] : []),
          ...(exactComposition
            ? [
                `Structural composition repeats puzzle ${exactComposition.puzzleId}: ${exactComposition.reasons.join(", ")}`,
              ]
            : []),
          ...(tooSimilar
            ? [
                `Structural similarity ${(tooSimilar.structuralSimilarity * 100).toFixed(1)}% to puzzle ${tooSimilar.puzzleId} exceeds ${(policy.structuralSimilarityLimit * 100).toFixed(0)}%`,
              ]
            : []),
          ...(recentFamilyUses >= policy.maxMechanismFamilyUses
            ? [
                `Mechanism family already used ${recentFamilyUses} times in ${policy.familyWindowDays} days`,
              ]
            : []),
          ...(recentTopologyUses >= policy.maxTopologyUses
            ? [
                `Visual topology already used ${recentTopologyUses} times in ${policy.familyWindowDays} days`,
              ]
            : []),
        ])
      );
      const closestStructuralSimilarity = comparisons[0]?.structuralSimilarity ?? 0;
      const score = blockers.length
        ? 0
        : Math.max(
            50,
            Math.round(
              100 -
                closestStructuralSimilarity * 45 -
                Math.min(18, recentFamilyUses * 6) -
                Math.min(12, recentTopologyUses * 4)
            )
          );
      const evidence: PuzzleNoveltyEvidence = {
        version: PUZZLE_NOVELTY_VERSION,
        fingerprint: signature.fingerprint,
        answerKey: signature.answerKey,
        mechanismFamilyKey: signature.mechanismFamilyKey,
        mechanismKey: signature.mechanismKey,
        topologyKey: signature.topologyKey,
        cueCombinationKey: signature.cueCombinationKey,
        orderedCueKey: signature.orderedCueKey,
        cueTokens: signature.cueTokens,
        score,
        closestStructuralSimilarity,
        recentMechanismFamilyUses: recentFamilyUses,
        recentTopologyUses,
        lookbackDays: policy.lookbackDays,
      };
      return {
        isUnique: blockers.length === 0,
        score,
        signature,
        evidence,
        blockers,
        recommendations: blockers.length
          ? blockers.map(
              (blocker) => `${blocker}. Change the answer, cue set, mechanism, or layout.`
            )
          : [],
        conflicts: comparisons
          .filter((comparison) => comparison.structuralSimilarity >= 0.55)
          .slice(0, 5),
      };
    },
  };
}

export function createInMemoryPuzzleNoveltyArchive(
  entries: PuzzleNoveltyArchiveEntry[]
): PuzzleNoveltyArchive {
  return {
    async findExactAnswer(answerKey) {
      return (
        entries.find((entry) => buildPuzzleNoveltySignature(entry).answerKey === answerKey) ?? null
      );
    },
    async listRecent(since, limit) {
      return entries
        .filter((entry) => entry.createdAt >= since)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, limit);
    },
  };
}
