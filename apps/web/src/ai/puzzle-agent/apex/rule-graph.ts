/**
 * Deterministic rule → graph → board composer for high-coverage techniques.
 *
 * COLUMBUS-style: apply named visual operators to host-owned cue plans instead
 * of leaving layout/joiners entirely to free-form invent. Asset fill stays in
 * composePuzzleVisual; this module only decides layers + layout.
 */

import type { TechniqueId } from "../technique-library";
import type { VisualLayer } from "../visual/composition";
import { resolveCuratedPictogram } from "../visual/curated-pictograms";
import type { AnswerSeedVisualCue } from "./types";

export type PuzzleLayoutMode = "row" | "stack" | "grid" | "overlay";

/** Techniques with a deterministic graph template in this slice. */
export const RULE_GRAPH_TECHNIQUES = [
  "simple_compound",
  "obvious_emoji_sum",
  "single_homophone",
  "basic_positional",
  "positional_phrase",
  "spatial_preposition_play",
  "math_symbol_wordplay",
  "size_or_case_semantics",
] as const satisfies readonly TechniqueId[];

export type RuleGraphTechniqueId = (typeof RULE_GRAPH_TECHNIQUES)[number];

export function isRuleGraphTechnique(id: string | undefined): id is RuleGraphTechniqueId {
  return Boolean(id && (RULE_GRAPH_TECHNIQUES as readonly string[]).includes(id));
}

/** Layout default when the agent omits layout but names a known technique. */
export function defaultLayoutForTechnique(techniqueId?: string): PuzzleLayoutMode {
  if (!isRuleGraphTechnique(techniqueId)) return "row";
  return composeRuleGraph({ techniqueId, cues: [] }).layout;
}

export type RuleGraphResult = {
  layers: VisualLayer[];
  layout: PuzzleLayoutMode;
  /** True when a technique template was applied (vs flat cue map). */
  applied: boolean;
  techniqueId: string | undefined;
  rules: string[];
};

function emojiForConcept(concept: string): string {
  const cleaned = concept
    .replace(/[^a-z0-9]+/gi, "")
    .slice(0, 2)
    .toUpperCase();
  return cleaned || "◆";
}

function cueToLayer(cue: AnswerSeedVisualCue): VisualLayer {
  if (cue.kind === "catalog") {
    const resolved = resolveCuratedPictogram(cue.concept);
    const concept = resolved?.canonicalConcept ?? cue.concept;
    return {
      kind: "pictogram",
      concept,
      role: cue.role,
      emojiFallback: emojiForConcept(concept),
      ...(resolved
        ? {
            svg: resolved.svg,
            assetId: resolved.assetId,
            source: "catalog" as const,
          }
        : {}),
    };
  }
  if (cue.kind === "text") {
    return {
      kind: "text",
      content: cue.content,
      emphasis: "normal",
    };
  }
  return {
    kind: "operator",
    symbol: cue.symbol,
  };
}

function isJoinOperator(layer: VisualLayer): boolean {
  return layer.kind === "operator" && /^[+=&]$/.test(layer.symbol.trim());
}

function isSemanticPart(layer: VisualLayer): boolean {
  return layer.kind === "pictogram" || layer.kind === "text" || layer.kind === "image";
}

/** Insert + between consecutive word-parts when the cue plan omitted joiners. */
function ensureCompoundJoiners(layers: VisualLayer[]): { layers: VisualLayer[]; changed: boolean } {
  if (layers.length < 2) return { layers, changed: false };
  const out: VisualLayer[] = [];
  let changed = false;
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]!;
    const prev = out[out.length - 1];
    if (prev && isSemanticPart(prev) && isSemanticPart(layer) && !isJoinOperator(prev)) {
      out.push({ kind: "operator", symbol: "+" });
      changed = true;
    }
    out.push(layer);
  }
  return { layers: out, changed };
}

/** Drop horizontal joiners — spatial layout carries the relationship. */
function stripJoinOperators(layers: VisualLayer[]): { layers: VisualLayer[]; changed: boolean } {
  const next = layers.filter((layer) => !isJoinOperator(layer));
  return { layers: next, changed: next.length !== layers.length };
}

function applySizeOrCaseSemantics(
  layers: VisualLayer[],
  answer: string | undefined
): { layers: VisualLayer[]; rules: string[] } {
  const rules: string[] = [];
  const answerKey = (answer ?? "").toLowerCase();
  const textIndexes = layers
    .map((layer, index) => (layer.kind === "text" ? index : -1))
    .filter((index) => index >= 0);

  if (!textIndexes.length) {
    return { layers, rules };
  }

  const next = layers.map((layer) => ({ ...layer })) as VisualLayer[];
  const prefersLarge =
    /\b(big|large|great|grand|major|capital|upper)\b/.test(answerKey) ||
    /\b(little|small|tiny|mini|micro|lower)\b/.test(answerKey) === false;

  if (textIndexes.length === 1) {
    const index = textIndexes[0]!;
    const layer = next[index];
    if (layer?.kind === "text" && layer.emphasis === "normal") {
      const emphasis = /\b(little|small|tiny|mini|micro|lower)\b/.test(answerKey)
        ? "small"
        : "large";
      next[index] = { ...layer, emphasis };
      rules.push(`size_or_case: single text → ${emphasis}`);
    }
    return { layers: next, rules };
  }

  const first = textIndexes[0]!;
  const second = textIndexes[1]!;
  const firstLayer = next[first];
  const secondLayer = next[second];
  if (firstLayer?.kind === "text" && secondLayer?.kind === "text") {
    if (prefersLarge && /\b(little|small|tiny|mini|micro)\b/.test(answerKey)) {
      next[first] = { ...firstLayer, emphasis: "large" };
      next[second] = { ...secondLayer, emphasis: "small" };
      rules.push("size_or_case: large then small contrast");
    } else if (/\b(little|small|tiny|mini|micro|lower)\b/.test(answerKey)) {
      next[first] = { ...firstLayer, emphasis: "small" };
      next[second] = { ...secondLayer, emphasis: "large" };
      rules.push("size_or_case: small then large contrast");
    } else {
      next[first] = { ...firstLayer, emphasis: "large" };
      next[second] = { ...secondLayer, emphasis: "small" };
      rules.push("size_or_case: default large/small contrast");
    }
  }
  return { layers: next, rules };
}

/**
 * Build layers + layout from a host cue plan and technique template.
 * Unknown techniques fall back to a flat row map (previous behavior).
 */
export function composeRuleGraph(input: {
  techniqueId?: string;
  cues: readonly AnswerSeedVisualCue[];
  answer?: string;
}): RuleGraphResult {
  const baseLayers = input.cues.map(cueToLayer);
  const techniqueId = input.techniqueId;

  if (!isRuleGraphTechnique(techniqueId)) {
    return {
      layers: baseLayers,
      layout: "row",
      applied: false,
      techniqueId,
      rules: techniqueId ? [`passthrough:${techniqueId}`] : ["passthrough:no-technique"],
    };
  }

  const rules: string[] = [`template:${techniqueId}`];
  let layers = baseLayers;
  let layout: PuzzleLayoutMode = "row";

  switch (techniqueId) {
    case "simple_compound":
    case "obvious_emoji_sum": {
      const joined = ensureCompoundJoiners(layers);
      layers = joined.layers;
      layout = "row";
      if (joined.changed) rules.push("insert:+ between word-parts");
      else rules.push("keep cue-plan joiners");
      break;
    }
    case "single_homophone": {
      layout = "row";
      const phonetic = input.cues.filter((cue) => cue.role === "phonetic-anchor").length;
      rules.push(
        phonetic
          ? `preserve ${phonetic} phonetic-anchor cue(s)`
          : "homophone board — no forced joiners"
      );
      break;
    }
    case "basic_positional":
    case "positional_phrase":
    case "spatial_preposition_play": {
      const stripped = stripJoinOperators(layers);
      layers = stripped.layers;
      layout = "stack";
      rules.push("layout:stack encodes spatial/prepositional reading");
      if (stripped.changed) rules.push("strip + joiners for spatial reading");
      if (layers.filter(isSemanticPart).length >= 3) {
        rules.push("multi-cue stack — order is the phrase");
      }
      break;
    }
    case "math_symbol_wordplay": {
      layout = "row";
      const hasMathOp = layers.some(
        (layer) => layer.kind === "operator" && /[+\-×÷/=]/.test(layer.symbol)
      );
      if (!hasMathOp && layers.filter(isSemanticPart).length >= 2) {
        // Insert a division-style operator between the first two parts when missing.
        const out: VisualLayer[] = [];
        let inserted = false;
        for (const layer of layers) {
          if (!inserted && out.length === 1 && isSemanticPart(layer)) {
            out.push({ kind: "operator", symbol: "/" });
            inserted = true;
            rules.push("insert:/ between operands");
          }
          out.push(layer);
        }
        layers = out;
      } else {
        rules.push(hasMathOp ? "keep math operator" : "math board without forced operator");
      }
      break;
    }
    case "size_or_case_semantics": {
      layout = "row";
      const styled = applySizeOrCaseSemantics(layers, input.answer);
      layers = styled.layers;
      rules.push(...styled.rules);
      if (!styled.rules.some((rule) => rule.startsWith("size_or_case:"))) {
        // Guarantee a styled text layer when any text exists so semantic-alignment passes.
        const firstText = layers.findIndex((layer) => layer.kind === "text");
        if (firstText >= 0) {
          const layer = layers[firstText];
          if (layer?.kind === "text") {
            layers = layers.map((entry, index) =>
              index === firstText && entry.kind === "text"
                ? { ...entry, emphasis: "large" as const }
                : entry
            );
            rules.push("size_or_case: fallback first text → large");
          }
        }
      }
      break;
    }
    default:
      break;
  }

  return {
    layers,
    layout,
    applied: true,
    techniqueId,
    rules,
  };
}
