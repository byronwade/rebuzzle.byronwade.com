import type { PuzzleVisual, VisualLayer } from "./visual/composition";
import { getCuratedPictogramAliases } from "./visual/curated-pictograms";
import { lookupIconFeatures } from "./visual/icon-features";

/**
 * Cheap, deterministic semantic checks for a composed board.
 *
 * These checks do not try to solve a rebus. They catch a more basic failure:
 * the declared mechanism and the player-visible cues cannot plausibly produce
 * the declared answer. Keeping this gate deterministic means a bad board is
 * rejected before novelty, calibration, or model judges spend budget on it.
 */
export const SEMANTIC_ALIGNMENT_VERSION = "semantic-alignment-v1";

export type SemanticAlignmentInput = {
  answer: string;
  techniqueId?: string;
  explanation?: string;
  visual?: PuzzleVisual;
  /** Static corpus fixtures may omit explanations; generation may not. */
  requireExplanation?: boolean;
};

export type SemanticCueEvidence = {
  kind: "pictogram" | "image" | "text";
  label: string;
  variants: string[];
  matchedVariant?: string;
};

export type SemanticAlignmentResult = {
  version: typeof SEMANTIC_ALIGNMENT_VERSION;
  ok: boolean;
  score: number;
  rule: string;
  blockers: string[];
  warnings: string[];
  cues: SemanticCueEvidence[];
};

/** Rebus readings that are useful for composition but are not icon identities. */
const REBUS_CUE_ALIASES: Record<string, string[]> = {
  anchor: ["hold"],
  baby: ["child"],
  boat: ["ship"],
  camera: ["shot"],
  clock: ["time"],
  diamond: ["gem"],
  envelope: ["letter", "mail"],
  fire: ["hot"],
  footprints: ["feet", "walk"],
  heart: ["love"],
  lightbulb: ["light"],
  lightning: ["flash"],
  music: ["song"],
  puzzle: ["piece"],
  rain: ["shower"],
  skull: ["dead", "death"],
  snowflake: ["cold", "snow"],
  sun: ["day"],
  trash: ["junk"],
  tree: ["forest"],
  watch: ["time"],
  wheat: ["grain"],
  wrench: ["tool"],
};

const NUMBER_WORDS: Record<string, string> = {
  "0": "zero",
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
};

const LITERAL_COMPOUND_TECHNIQUE = "simple_compound";
const POSITIONAL_TECHNIQUES = new Set([
  "basic_positional",
  "positional_phrase",
  "spatial_preposition_play",
]);
const PHONETIC_TECHNIQUES = new Set([
  "single_homophone",
  "nested_homophone",
  "multi_layer_phonetic",
]);

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value: string): string {
  return normalize(value).replace(/\s+/g, "");
}

function unique(values: string[]): string[] {
  return [
    ...new Set(
      values.flatMap((v) => {
        const n = normalize(v);
        return n ? [n] : [];
      })
    ),
  ];
}

function containsTokenSequence(haystack: string, needle: string): boolean {
  const haystackTokens = normalize(haystack).split(/\s+/).filter(Boolean);
  const needleTokens = normalize(needle).split(/\s+/).filter(Boolean);
  if (!haystackTokens.length || !needleTokens.length) return false;
  if (needleTokens.length > haystackTokens.length) return false;
  return Array.from({ length: haystackTokens.length - needleTokens.length + 1 }).some((_, start) =>
    needleTokens.every((token, index) => haystackTokens[start + index] === token)
  );
}

function answerContainsVariant(answer: string, variant: string): boolean {
  const answerKey = compact(answer);
  const variantKey = compact(variant);
  if (!answerKey || !variantKey) return false;
  if (answerKey === variantKey || answerKey.includes(variantKey)) return true;
  return containsTokenSequence(answer, variant);
}

function cueBaseVariants(layer: VisualLayer): string[] {
  if (layer.kind === "text") {
    const numberWord = NUMBER_WORDS[layer.content.trim()];
    return [layer.content, ...(numberWord ? [numberWord] : [])];
  }

  if (layer.kind === "image") return layer.concept ? [layer.concept] : [];

  if (layer.kind !== "pictogram") return [];

  const concept = layer.concept.trim();
  const canonical = compact(concept);
  const featureEntry = lookupIconFeatures(concept);
  return [
    concept,
    ...getCuratedPictogramAliases(concept),
    ...(featureEntry?.aliases ?? []),
    ...(REBUS_CUE_ALIASES[canonical] ?? []),
  ];
}

function cueEvidence(layer: VisualLayer): SemanticCueEvidence | null {
  if (layer.kind === "operator") return null;
  const label = layer.kind === "text" ? layer.content : (layer.concept ?? "");
  const variants = unique(cueBaseVariants(layer));
  if (!label.trim() || !variants.length) return null;
  return { kind: layer.kind, label: label.trim(), variants };
}

function collectCues(visual: PuzzleVisual | undefined): SemanticCueEvidence[] {
  return (visual?.layers ?? [])
    .map(cueEvidence)
    .filter((cue): cue is SemanticCueEvidence => Boolean(cue));
}

/**
 * Match ordered visual cues against the compact answer for literal compounds.
 * A cue may use a curated synonym (e.g. clock → time) but cannot skip answer
 * characters; this prevents a single coincidental substring from passing.
 */
function matchOrderedCompound(answer: string, cues: SemanticCueEvidence[]): string[] | null {
  const answerKey = compact(answer);
  if (!answerKey || !cues.length) return null;

  const memo = new Map<string, string[] | null>();
  function visit(cueIndex: number, offset: number): string[] | null {
    const key = `${cueIndex}:${offset}`;
    if (memo.has(key)) return memo.get(key)!;
    if (cueIndex === cues.length) {
      const result = offset === answerKey.length ? [] : null;
      memo.set(key, result);
      return result;
    }

    const cue = cues[cueIndex]!;
    const sortedVariants = [...cue.variants].sort((left, right) => right.length - left.length);
    for (const variant of sortedVariants) {
      const variantKey = compact(variant);
      if (variantKey.length < 2 || !answerKey.startsWith(variantKey, offset)) continue;
      const remainder = visit(cueIndex + 1, offset + variantKey.length);
      if (remainder) {
        const result = [variant, ...remainder];
        memo.set(key, result);
        return result;
      }
    }

    memo.set(key, null);
    return null;
  }

  return visit(0, 0);
}

function hasMechanismLanguage(explanation: string | undefined, pattern: RegExp): boolean {
  return Boolean(explanation && pattern.test(explanation));
}

function hasCueMention(explanation: string | undefined, cues: SemanticCueEvidence[]): boolean {
  if (!explanation) return false;
  return cues.some((cue) =>
    cue.variants.some((variant) => answerContainsVariant(explanation, variant))
  );
}

function isSpatialLayout(visual: PuzzleVisual | undefined): boolean {
  if (!visual) return false;
  if (visual.layout !== "row") return true;
  return visual.layers.some(
    (layer) => layer.kind === "operator" && /[↑↓←→↔↕/\\]/.test(layer.symbol)
  );
}

function hasOrderedSpatialLanguage(explanation: string | undefined): boolean {
  return Boolean(
    explanation &&
      /\b(after|before|left of|right of|first|last|next to|beside)\b/i.test(explanation)
  );
}

function evaluateLiteralCompound(
  answer: string,
  cues: SemanticCueEvidence[],
  blockers: string[]
): string[] {
  if (cues.length < 2) {
    blockers.push("Simple compound needs at least two visible semantic parts");
    return [];
  }
  const matched = matchOrderedCompound(answer, cues);
  if (!matched) {
    blockers.push(
      `Visible parts do not form the answer in order: ${cues.map((cue) => cue.label).join(" + ")} → ${answer}`
    );
  }
  return matched ?? [];
}

/**
 * Evaluate semantic alignment before any expensive model-backed judge.
 * `ok` means the board passes deterministic plausibility checks; it is not a
 * substitute for blind recognition or human playtesting.
 */
export function evaluateSemanticAlignment(input: SemanticAlignmentInput): SemanticAlignmentResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const cues = collectCues(input.visual);
  const technique = input.techniqueId ?? "unknown";
  const explanationRequired = input.requireExplanation !== false;
  let rule = "generic";
  let matchedVariants: string[] = [];

  if (!input.answer.trim()) blockers.push("Semantic alignment requires a non-empty answer");
  if (!cues.length) blockers.push("Board has no visible semantic cues");

  for (const cue of cues) {
    if (!cue.variants.length) blockers.push(`Cue has no readable label: ${cue.label}`);
  }

  if (technique === LITERAL_COMPOUND_TECHNIQUE) {
    rule = "ordered-literal-compound";
    matchedVariants = evaluateLiteralCompound(input.answer, cues, blockers);
  } else if (technique === "size_or_case_semantics") {
    rule = "typographic-semantic-cue";
    const styled = (input.visual?.layers ?? []).filter(
      (layer): layer is Extract<VisualLayer, { kind: "text" }> =>
        layer.kind === "text" && layer.emphasis !== "normal"
    );
    const spacingCue = Boolean(
      input.visual?.unicodeFallback && /\s{3,}/.test(input.visual.unicodeFallback)
    );
    if (!styled.length && !spacingCue) {
      blockers.push("Size/case technique needs a visibly styled text layer or spacing cue");
    }
    if (
      styled.length &&
      !styled.some((layer) => answerContainsVariant(input.answer, layer.content))
    ) {
      blockers.push("Styled text does not contribute a visible token from the answer");
    }
  } else if (POSITIONAL_TECHNIQUES.has(technique)) {
    rule = "spatial-layout-and-explanation";
    if (
      !isSpatialLayout(input.visual) &&
      !(technique === "spatial_preposition_play" && hasOrderedSpatialLanguage(input.explanation))
    ) {
      blockers.push(`${technique} requires a non-row layout or explicit spatial operator`);
    }
    if (cues.length < 2) blockers.push(`${technique} needs at least two positioned semantic cues`);
    if (
      !hasMechanismLanguage(
        input.explanation,
        /\b(above|below|under|over|between|after|before|around|inside|across|cross|intersect|overlap|position|placement|stack|line|road)\b/i
      )
    ) {
      const message = "Explanation does not name the spatial relationship";
      if (explanationRequired) blockers.push(message);
      else warnings.push(message);
    }
  } else if (technique === "math_symbol_wordplay") {
    rule = "operator-wordplay";
    const hasOperator = (input.visual?.layers ?? []).some(
      (layer) => layer.kind === "operator" && /[+\-×÷/=✓✔]/.test(layer.symbol)
    );
    if (!hasOperator) blockers.push("Math wordplay needs a visible operator or check symbol");
  } else if (PHONETIC_TECHNIQUES.has(technique)) {
    rule = "phonetic-explanation";
    const literalMatch = matchOrderedCompound(input.answer, cues);
    if (literalMatch) {
      matchedVariants = literalMatch;
      warnings.push("Phonetic technique currently reads as a literal compound");
    } else if (
      !hasMechanismLanguage(
        input.explanation,
        /\b(sound(?:s)? like|sound-alike|homophone|phonetic|pronounc|say it aloud|read(?:s)? as|letter|number|repeat|copies|times)\b/i
      )
    ) {
      const message =
        "Phonetic technique lacks an explicit sound/letter mapping in the explanation";
      if (explanationRequired) blockers.push(message);
      else warnings.push(message);
    } else if (!hasCueMention(input.explanation, cues)) {
      blockers.push("Phonetic explanation does not mention any visible cue");
    }
  } else if (technique === "obvious_emoji_sum" || technique === "multi_emoji_compound") {
    rule = "ordered-cue-composition";
    if (cues.length < 2) blockers.push(`${technique} needs at least two visible semantic cues`);
    if (
      !hasMechanismLanguage(input.explanation, /\b(combine|join|add|plus|sum|part|form|read)\b/i)
    ) {
      warnings.push("Explanation does not explicitly describe how the cues combine");
    }
  } else if (technique === "idiom_as_picture" || technique === "rare_but_fair_idiom") {
    rule = "idiom-mapping";
    if (
      !hasMechanismLanguage(
        input.explanation,
        /\b(idiom|phrase|means|literal|picture|stands for|maps|represents|gives|forms|makes|plus|combine|join)\b/i
      )
    ) {
      const message = "Idiom technique lacks a clear literal-to-phrase explanation";
      if (explanationRequired) blockers.push(message);
      else warnings.push(message);
    }
  } else if (technique === "false_lead_visual" || technique === "triple_layer_composition") {
    rule = "multi-layer-composition";
    if (cues.length < 2) blockers.push(`${technique} needs multiple visible semantic cues`);
    if (!input.explanation || input.explanation.trim().length < 40) {
      const message = `${technique} needs a complete explanation for every visual layer`;
      if (explanationRequired) blockers.push(message);
      else warnings.push(message);
    }
  }

  if (cues.length >= 2 && !matchedVariants.length) {
    const answerMentioned = cues.filter((cue) =>
      cue.variants.some((variant) => answerContainsVariant(input.answer, variant))
    ).length;
    if (answerMentioned === 0 && !PHONETIC_TECHNIQUES.has(technique)) {
      warnings.push(
        "No visible cue label appears verbatim in the answer; rely on explicit explanation"
      );
    }
  }

  const score = blockers.length
    ? Math.max(0, 40 - blockers.length * 15)
    : Math.max(0, 100 - warnings.length * 8);

  return {
    version: SEMANTIC_ALIGNMENT_VERSION,
    ok: blockers.length === 0,
    score,
    rule,
    blockers,
    warnings,
    cues: cues.map((cue, index) => ({
      ...cue,
      matchedVariant: matchedVariants[index],
    })),
  };
}
