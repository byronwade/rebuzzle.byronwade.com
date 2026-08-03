import type { PuzzleVisual } from "../visual/composition";
import { resolveCuratedPictogram } from "../visual/curated-pictograms";
import type { AnswerSeedVisualCue } from "./types";

function normalizeCueText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cueLabel(cue: AnswerSeedVisualCue): string {
  if (cue.kind === "catalog") return `catalog:${cue.concept}`;
  if (cue.kind === "text") return `text:${cue.content}`;
  return `operator:${cue.symbol}`;
}

/**
 * Validate the seed contract before it reaches a paid model call.
 * Catalog cues must resolve to non-quarantined reviewed assets.
 */
export function answerSeedCuePlanIssues(
  cues: readonly AnswerSeedVisualCue[] | undefined
): string[] {
  if (!cues?.length) return [];

  const issues: string[] = [];
  const seen = new Set<string>();
  for (const cue of cues) {
    const label = cueLabel(cue);
    if (seen.has(label)) {
      issues.push(`Duplicate answer-seed cue: ${label}`);
      continue;
    }
    seen.add(label);

    if (cue.kind === "catalog") {
      if (!resolveCuratedPictogram(cue.concept)) {
        issues.push(`Answer-seed cue is not an approved catalog concept: ${cue.concept}`);
      }
      continue;
    }

    if (cue.kind === "text" && !normalizeCueText(cue.content)) {
      issues.push("Answer-seed text cue cannot be empty");
      continue;
    }

    if (cue.kind === "operator" && !cue.symbol.trim()) {
      issues.push("Answer-seed operator cue cannot be empty");
    }
  }
  return issues;
}

/**
 * Return missing ingredients after the authoritative board has been composed.
 * This is deliberately deterministic: a prompt suggestion is not evidence
 * that the model actually placed the requested cue on the board.
 */
export function missingAnswerSeedCues(input: {
  visual: PuzzleVisual;
  cues?: readonly AnswerSeedVisualCue[];
}): string[] {
  const cues = input.cues;
  if (!cues?.length) return [];

  const pictogramLayers = input.visual.layers.filter((layer) => layer.kind === "pictogram");
  const textLayers = input.visual.layers.filter((layer) => layer.kind === "text");
  const operatorLayers = input.visual.layers.filter((layer) => layer.kind === "operator");

  return cues.flatMap((cue) => {
    if (cue.kind === "catalog") {
      const expected = resolveCuratedPictogram(cue.concept)?.canonicalConcept;
      const present = pictogramLayers.some(
        (layer) => resolveCuratedPictogram(layer.concept)?.canonicalConcept === expected
      );
      return present ? [] : [`Missing catalog cue ${cue.concept}`];
    }

    if (cue.kind === "text") {
      const expected = normalizeCueText(cue.content);
      const present = textLayers.some((layer) => normalizeCueText(layer.content) === expected);
      return present ? [] : [`Missing text cue ${cue.content}`];
    }

    const present = operatorLayers.some((layer) => layer.symbol.trim() === cue.symbol.trim());
    return present ? [] : [`Missing operator cue ${cue.symbol}`];
  });
}

export function formatAnswerSeedCuePlan(cues: readonly AnswerSeedVisualCue[] | undefined): string {
  if (!cues?.length) return "";
  return cues
    .map((cue) => {
      if (cue.kind === "catalog") return `${cue.concept} [reviewed pictogram; ${cue.role}]`;
      if (cue.kind === "text") return `"${cue.content}" [visible text; ${cue.role}]`;
      return `${cue.symbol} [operator; structural-anchor]`;
    })
    .join("; ");
}
