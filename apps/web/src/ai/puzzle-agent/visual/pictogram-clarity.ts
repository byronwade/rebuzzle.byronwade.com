/**
 * Deterministic clarity gate for LLM-generated Ink Pictograms.
 * Catches blobs, empty geometry, and over-decorated SVGs that players can't read.
 */

import { getIconFeatureHints } from "./icon-features";

export type PictogramClarityResult = {
  /** 0–100 craft/readability estimate */
  score: number;
  ok: boolean;
  reasons: string[];
};

const MIN_PASS_SCORE = 58;

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export type PictogramClarityOptions = {
  /**
   * Open icon packs (Lucide/Phosphor/etc.) are often 2–4 clean shapes.
   * Soften sparse-shape penalties so curated packs aren't rejected.
   */
  librarySource?: boolean;
};

/**
 * Heuristic readability score for a sanitized pictogram SVG.
 * Not perfect — but blocks the worst unreadable blobs before publish.
 */
export function scorePictogramClarity(
  svg: string | null | undefined,
  options: PictogramClarityOptions = {}
): PictogramClarityResult {
  const reasons: string[] = [];
  if (!svg || !svg.includes("<svg")) {
    return { score: 0, ok: false, reasons: ["missing_svg"] };
  }

  let score = 52;

  if (/<linearGradient|<radialGradient|<filter\b|feGaussianBlur|feDropShadow/i.test(svg)) {
    score -= 28;
    reasons.push("effects_or_gradients");
  }

  const shapeTags =
    svg.match(/<(path|circle|ellipse|rect|polygon|polyline|line)\b/gi)?.length ?? 0;

  if (shapeTags === 0) {
    score -= 45;
    reasons.push("no_shapes");
  } else if (shapeTags === 1) {
    score -= options.librarySource ? 12 : 30;
    reasons.push("too_few_shapes");
  } else if (shapeTags === 2) {
    // Curated packs often ship as path+circle — still readable
    if (options.librarySource) score += 10;
    else {
      score -= 8;
      reasons.push("sparse_shapes");
    }
  } else if (shapeTags >= 3 && shapeTags <= 10) {
    // Research: small icons excel with few perceptual shapes + bold silhouette
    score += 24;
  } else if (shapeTags <= 14) {
    score += 14;
  } else if (shapeTags <= 20) {
    score += 4;
    reasons.push("busy_icon");
  } else {
    score -= 20;
    reasons.push("overly_complex");
  }

  if (options.librarySource) {
    score += 8;
    reasons.push("library_pack");
  }

  const onlyCircle =
    shapeTags === 1 && /<circle\b/i.test(svg) && !/<(path|ellipse|rect|polygon)\b/i.test(svg);
  if (onlyCircle) {
    score -= 35;
    reasons.push("blob_circle");
  }

  const pathData = [...svg.matchAll(/\bd=["']([^"']{0,4000})["']/gi)].map((m) => m[1] ?? "");
  const totalPathChars = pathData.reduce((sum, d) => sum + d.replace(/\s+/g, "").length, 0);
  if (shapeTags > 0 && totalPathChars + shapeTags * 8 < 24) {
    score -= 18;
    reasons.push("thin_geometry");
  }
  if (totalPathChars > 80) score += 6;

  const hasStroke = /\bstroke\s*=/i.test(svg) || /stroke\s*:/i.test(svg);
  if (hasStroke) score += 12;
  else {
    score -= 12;
    reasons.push("missing_stroke");
  }

  // Hairline strokes collapse at 48–64px (iconography research)
  const strokeWidths = [...svg.matchAll(/stroke-width\s*[:=]\s*["']?(\d+(?:\.\d+)?)/gi)].map(
    (m) => Number(m[1])
  );
  if (strokeWidths.length) {
    const minStroke = Math.min(...strokeWidths);
    const avgStroke =
      strokeWidths.reduce((a, b) => a + b, 0) / strokeWidths.length;
    if (minStroke > 0 && minStroke < 1.5) {
      score -= 14;
      reasons.push("hairline_stroke");
    } else if (avgStroke >= 2) {
      score += 6;
    }
  }

  if (/stroke-linecap\s*=\s*["']round["']/i.test(svg)) score += 3;
  if (/stroke-linejoin\s*=\s*["']round["']/i.test(svg)) score += 2;

  const hasFill = /\bfill\s*=/i.test(svg) || /fill\s*:/i.test(svg);
  if (hasFill) score += 4;

  if (/#(?:6[0-9a-f]{5}|7[0-9a-f]{5}|8[0-9a-f]{5}|9[0-9a-f]{5}|a[0-9a-f]{5}|b[0-9a-f]{5})\b|purple|violet|indigo|#7c3aed|#8b5cf6/i.test(
    svg
  )) {
    score -= 14;
    reasons.push("off_palette");
  }

  if (/<text\b/i.test(svg)) {
    score -= 6;
    reasons.push("contains_text");
  }

  // Tiny viewBox occupancy heuristics: tiny radii / boxes suggest unreadable dots
  const tinyCircles = [...svg.matchAll(/<circle\b[^>]*\br=["'](\d+(?:\.\d+)?)["']/gi)].filter(
    (m) => Number(m[1]) > 0 && Number(m[1]) < 1.2
  ).length;
  if (tinyCircles >= 4) {
    score -= 10;
    reasons.push("dust_details");
  }

  const finalScore = clampScore(score);
  const ok = finalScore >= MIN_PASS_SCORE && !reasons.includes("no_shapes");

  if (!ok && reasons.length === 0) reasons.push("below_clarity_threshold");

  return { score: finalScore, ok, reasons };
}

export function passesPictogramClarity(svg: string | null | undefined): boolean {
  return scorePictogramClarity(svg).ok;
}

/** Words that rarely draw well as a single icon — force a concrete metaphor. */
const ABSTRACT_CONCEPTS = new Set([
  "love",
  "time",
  "success",
  "happiness",
  "freedom",
  "power",
  "energy",
  "idea",
  "thought",
  "hope",
  "fear",
  "luck",
  "peace",
  "chaos",
  "truth",
  "beauty",
  "mind",
  "soul",
  "spirit",
  "future",
  "past",
  "memory",
  "dream",
  "anger",
  "joy",
  "faith",
  "trust",
  "wisdom",
  "knowledge",
  "justice",
  "nature",
  "music",
  "sound",
  "silence",
  "speed",
  "strength",
  "weakness",
  "danger",
  "safety",
  "friendship",
  "family",
  "work",
  "life",
  "death",
  "change",
  "balance",
  "chaos",
  "order",
]);

export function isAbstractPictogramConcept(concept: string): boolean {
  const key = concept.trim().toLowerCase().replace(/[^a-z\s-]/g, "");
  if (!key) return true;
  if (ABSTRACT_CONCEPTS.has(key)) return true;
  // Multi-word abstract phrases
  const parts = key.split(/[\s-]+/).filter(Boolean);
  return parts.length > 0 && parts.every((p) => ABSTRACT_CONCEPTS.has(p));
}

/**
 * Extra drawing brief so the model picks a concrete, recognizable subject.
 */
export function buildConcreteDrawingBrief(concept: string): string {
  const trimmed = concept.trim();
  const features = getIconFeatureHints(trimmed);

  if (isAbstractPictogramConcept(trimmed)) {
    return [
      `"${trimmed}" is abstract — do NOT draw a vague blob or decorative swirl.`,
      `Pick ONE concrete iconic object players instantly associate with it`,
      `(e.g. heart→love, hourglass/clock→time, lightbulb→idea, trophy→success).`,
      `Draw that object with unmistakable identifying features.`,
      features,
    ].join(" ");
  }
  return [
    `Draw ONE concrete real-world object: a clear "${trimmed}".`,
    `Someone glancing at 64×64 must recognize it in under one second.`,
    `Sketch it the way a human would — bold outline first, then identifying marks.`,
    features,
  ].join(" ");
}
