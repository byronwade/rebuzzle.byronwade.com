/**
 * Mechanism fingerprint — catch near-clone boards even when answers differ slightly.
 */

import { createHash } from "node:crypto";
import { normalizeAnswerKey } from "../quality";
import type { PuzzleVisual } from "../visual/composition";

export type MechanismFingerprintInput = {
  answer: string;
  techniqueId?: string;
  rebusPuzzle?: string;
  visual?: PuzzleVisual;
  layout?: string;
};

/**
 * Stable fingerprint of how the puzzle works (not just the answer).
 */
export function mechanismFingerprint(input: MechanismFingerprintInput): string {
  const concepts = (input.visual?.layers ?? [])
    .flatMap((layer) => {
      if (layer.kind === "pictogram" && layer.concept) {
        return [layer.concept.toLowerCase().replace(/[^a-z0-9]+/g, "")];
      }
      if (layer.kind === "text" && layer.content) {
        return [
          `t:${layer.content.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12)}:${layer.emphasis ?? "n"}`,
        ];
      }
      if (layer.kind === "operator" && layer.symbol) {
        return [`op:${layer.symbol}`];
      }
      return [];
    })
    .sort();

  const layout = input.visual?.layout || input.layout || "row";
  const display = (input.visual?.unicodeFallback || input.rebusPuzzle || "")
    .toLowerCase()
    .replace(/\s+/g, "");

  const raw = [
    input.techniqueId || "unknown",
    layout,
    concepts.join("|"),
    display.slice(0, 48),
    // answer shape (word count + first letters) — not full answer, to catch isomorphic boards
    answerShape(input.answer),
  ].join("::");

  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

function answerShape(answer: string): string {
  const words = answer.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return `${words.length}:${words.map((w) => w[0] ?? "").join("")}`;
}

/**
 * Jaccard similarity over pictogram concepts + technique + layout.
 */
export function mechanismSimilarity(
  a: MechanismFingerprintInput,
  b: MechanismFingerprintInput
): number {
  if (
    a.techniqueId &&
    b.techniqueId &&
    a.techniqueId === b.techniqueId &&
    mechanismFingerprint(a) === mechanismFingerprint(b)
  ) {
    return 1;
  }

  const setA = conceptSet(a);
  const setB = conceptSet(b);
  if (!setA.size && !setB.size) {
    // Fall back to answer-key proximity
    const ka = normalizeAnswerKey(a.answer);
    const kb = normalizeAnswerKey(b.answer);
    if (!ka || !kb) return 0;
    if (ka === kb) return 1;
    return ka.includes(kb) || kb.includes(ka) ? 0.7 : 0;
  }

  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter += 1;
  const union = new Set([...setA, ...setB]).size || 1;
  let sim = inter / union;

  if (a.techniqueId && a.techniqueId === b.techniqueId) sim += 0.15;
  const layoutA = a.visual?.layout || a.layout;
  const layoutB = b.visual?.layout || b.layout;
  if (layoutA && layoutA === layoutB) sim += 0.1;

  return Math.min(1, sim);
}

function conceptSet(input: MechanismFingerprintInput): Set<string> {
  const out = new Set<string>();
  for (const layer of input.visual?.layers ?? []) {
    if (layer.kind === "pictogram" && layer.concept) {
      out.add(layer.concept.toLowerCase().replace(/[^a-z0-9]+/g, ""));
    }
    if (layer.kind === "text" && layer.content) {
      out.add(`t:${layer.content.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10)}`);
    }
  }
  const fallback = (input.rebusPuzzle || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
  for (const w of fallback.slice(0, 4)) out.add(w);
  return out;
}
