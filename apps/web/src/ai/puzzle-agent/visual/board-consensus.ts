import { distinctJudgeResults } from "../quality-contract";
import type { PuzzleVisual } from "./composition";
import { conceptMatchesSeen } from "./icon-features";

export type BoardPerception = {
  model: string;
  objects: Array<{ label: string; confidence: number }>;
  visibleText: string[];
  visibleOperators: string[];
  relationships: string[];
  hasClipping: boolean;
  hasAccidentalOverlap: boolean;
  unreadableElements: string[];
  overallConfidence: number;
};

export type BoardRecognitionResult = {
  ok: boolean;
  reason?: string;
  perceptions: BoardPerception[];
  conceptVotes: Record<string, number>;
  textVotes: Record<string, number>;
  operatorVotes: Record<string, number>;
  profileResults?: BoardProfileRecognitionResult[];
};

export type BoardProfileRecognitionResult = Omit<BoardRecognitionResult, "profileResults"> & {
  profileId: string;
  viewportWidth: number;
  tileSize: number;
  width: number;
  height: number;
  wrappedRows: number;
};

function normalizeVisibleText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function countTextCueOccurrences(expected: string, visibleText: string[]): number {
  const normalizedExpected = normalizeVisibleText(expected);
  if (!normalizedExpected) return 0;
  const expectedTokens = normalizedExpected.split(" ");
  const compactExpected = normalizedExpected.replaceAll(" ", "");
  return visibleText.reduce((total, value) => {
    const candidate = normalizeVisibleText(value);
    if (!candidate) return total;
    const candidateTokens = candidate.split(" ");
    let matches = 0;
    for (let index = 0; index <= candidateTokens.length - expectedTokens.length; index += 1) {
      if (expectedTokens.every((token, offset) => candidateTokens[index + offset] === token)) {
        matches += 1;
      }
    }
    if (matches > 0) return total + matches;
    return (
      total +
      (compactExpected.length >= 3 && candidate.replaceAll(" ", "") === compactExpected ? 1 : 0)
    );
  }, 0);
}

function normalizeOperator(value: string): string {
  const normalized = value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
  if (["+", "plus", "add", "addition"].includes(normalized)) return "+";
  if (["/", "slash", "divide", "division", "over"].includes(normalized)) return "/";
  if (["→", "->", "arrow", "right arrow", "right-arrow"].includes(normalized)) return "→";
  if (["×", "x", "multiply", "multiplication"].includes(normalized)) return "×";
  if (["-", "−", "–", "—", "minus", "subtract", "subtraction"].includes(normalized)) {
    return "-";
  }
  return normalized;
}

function countsByValue(values: string[]): Map<string, number> {
  return values.reduce((counts, value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

function missingCueLabel(value: string, requiredCount: number): string {
  return requiredCount > 1 ? `${value} ×${requiredCount}` : value;
}

export function evaluateBoardPerceptionConsensus(input: {
  visual: PuzzleVisual;
  perceptions: BoardPerception[];
  requiredVotes: number;
  minConfidence: number;
}): BoardRecognitionResult {
  const perceptions = distinctJudgeResults(input.perceptions);
  if (perceptions.length < input.requiredVotes) {
    return {
      ok: false,
      reason: "Not enough independent board perception judges",
      perceptions,
      conceptVotes: {},
      textVotes: {},
      operatorVotes: {},
    };
  }

  const expectedConceptCounts = countsByValue(
    input.visual.layers.flatMap((layer) => (layer.kind === "pictogram" ? [layer.concept] : []))
  );
  const expectedConcepts = Array.from(expectedConceptCounts.keys());
  const conceptVotes = Object.fromEntries(
    expectedConcepts.map((concept) => [
      concept,
      perceptions.filter(
        (perception) =>
          perception.objects.filter(
            (object) =>
              object.confidence >= input.minConfidence && conceptMatchesSeen(concept, object.label)
          ).length >= (expectedConceptCounts.get(concept) ?? 1)
      ).length,
    ])
  );
  const expectedTextCounts = countsByValue(
    input.visual.layers.flatMap((layer) => (layer.kind === "text" ? [layer.content] : []))
  );
  const expectedText = Array.from(expectedTextCounts.keys());
  const textVotes = Object.fromEntries(
    expectedText.map((content) => [
      content,
      perceptions.filter(
        (perception) =>
          countTextCueOccurrences(content, perception.visibleText) >=
          (expectedTextCounts.get(content) ?? 1)
      ).length,
    ])
  );
  const expectedOperatorCounts = countsByValue(
    input.visual.layers.flatMap((layer) => (layer.kind === "operator" ? [layer.symbol] : []))
  );
  const expectedOperators = Array.from(expectedOperatorCounts.keys());
  const operatorVotes = Object.fromEntries(
    expectedOperators.map((symbol) => [
      symbol,
      perceptions.filter(
        (perception) =>
          perception.visibleOperators.filter(
            (visibleOperator) => normalizeOperator(visibleOperator) === normalizeOperator(symbol)
          ).length >= (expectedOperatorCounts.get(symbol) ?? 1)
      ).length,
    ])
  );

  const missing = expectedConcepts.filter(
    (concept) => (conceptVotes[concept] ?? 0) < input.requiredVotes
  );
  if (missing.length) {
    return {
      ok: false,
      reason: `Rendered board objects not recognized: ${missing
        .map((concept) => missingCueLabel(concept, expectedConceptCounts.get(concept) ?? 1))
        .join(", ")}`,
      perceptions,
      conceptVotes,
      textVotes,
      operatorVotes,
    };
  }

  const missingText = expectedText.filter(
    (content) => (textVotes[content] ?? 0) < input.requiredVotes
  );
  if (missingText.length) {
    return {
      ok: false,
      reason: `Rendered board text not recognized: ${missingText
        .map((content) => missingCueLabel(content, expectedTextCounts.get(content) ?? 1))
        .join(", ")}`,
      perceptions,
      conceptVotes,
      textVotes,
      operatorVotes,
    };
  }

  const missingOperators = expectedOperators.filter(
    (symbol) => (operatorVotes[symbol] ?? 0) < input.requiredVotes
  );
  if (missingOperators.length) {
    return {
      ok: false,
      reason: `Rendered board operators not recognized: ${missingOperators
        .map((symbol) => missingCueLabel(symbol, expectedOperatorCounts.get(symbol) ?? 1))
        .join(", ")}`,
      perceptions,
      conceptVotes,
      textVotes,
      operatorVotes,
    };
  }

  if (perceptions.some((perception) => perception.hasClipping)) {
    return {
      ok: false,
      reason: "Rendered board has clipped visual content",
      perceptions,
      conceptVotes,
      textVotes,
      operatorVotes,
    };
  }
  if (perceptions.some((perception) => perception.hasAccidentalOverlap)) {
    return {
      ok: false,
      reason: "Rendered board has accidental overlap",
      perceptions,
      conceptVotes,
      textVotes,
      operatorVotes,
    };
  }
  if (perceptions.some((perception) => perception.unreadableElements.length > 0)) {
    return {
      ok: false,
      reason: "Rendered board contains unreadable elements",
      perceptions,
      conceptVotes,
      textVotes,
      operatorVotes,
    };
  }

  return { ok: true, perceptions, conceptVotes, textVotes, operatorVotes };
}

/** Require every production board profile to pass; aggregate the weakest evidence. */
export function evaluateBoardProfileConsensus(input: {
  visual: PuzzleVisual;
  profileResults: BoardProfileRecognitionResult[];
  expectedProfileIds: readonly string[];
}): BoardRecognitionResult {
  const failed = input.profileResults.filter((profile) => !profile.ok);
  const testedProfiles = new Set(input.profileResults.map((profile) => profile.profileId));
  const missingProfiles = input.expectedProfileIds.filter((id) => !testedProfiles.has(id));
  const expectedConcepts = Array.from(
    new Set(
      input.visual.layers.flatMap((layer) => (layer.kind === "pictogram" ? [layer.concept] : []))
    )
  );
  const conceptVotes = Object.fromEntries(
    expectedConcepts.map((concept) => [
      concept,
      input.profileResults.length
        ? Math.min(...input.profileResults.map((profile) => profile.conceptVotes[concept] ?? 0))
        : 0,
    ])
  );
  const expectedText = Array.from(
    new Set(input.visual.layers.flatMap((layer) => (layer.kind === "text" ? [layer.content] : [])))
  );
  const textVotes = Object.fromEntries(
    expectedText.map((content) => [
      content,
      input.profileResults.length
        ? Math.min(...input.profileResults.map((profile) => profile.textVotes[content] ?? 0))
        : 0,
    ])
  );
  const expectedOperators = Array.from(
    new Set(
      input.visual.layers.flatMap((layer) => (layer.kind === "operator" ? [layer.symbol] : []))
    )
  );
  const operatorVotes = Object.fromEntries(
    expectedOperators.map((symbol) => [
      symbol,
      input.profileResults.length
        ? Math.min(...input.profileResults.map((profile) => profile.operatorVotes[symbol] ?? 0))
        : 0,
    ])
  );
  const perceptions: BoardPerception[] = input.profileResults.flatMap((profile) =>
    profile.perceptions.map((perception) => ({
      ...perception,
      model: `${perception.model}@${profile.profileId}`,
    }))
  );
  const reasons = [
    ...failed.map((profile) => `${profile.profileId}: ${profile.reason ?? "failed"}`),
    ...(missingProfiles.length ? [`Missing profiles: ${missingProfiles.join(", ")}`] : []),
  ];

  return {
    ok: input.profileResults.length > 0 && reasons.length === 0,
    reason: reasons.length ? reasons.join(" | ") : undefined,
    perceptions,
    conceptVotes,
    textVotes,
    operatorVotes,
    profileResults: input.profileResults,
  };
}
