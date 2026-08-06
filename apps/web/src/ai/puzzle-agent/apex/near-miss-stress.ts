/**
 * Alternate-answer / near-miss stress gate.
 *
 * Catches boards that stay solvable for a close cousin of the intended answer
 * (substring phrase, plural/singular cousin, or a packed collision with another
 * phrase-bank entry). Fail closed so those drafts never reach publish.
 */

import { PHRASE_BANK } from "./phrase-bank";

export type NearMissStressResult = {
  ok: boolean;
  issues: string[];
  nearMisses: string[];
};

/** Keep spaces so multi-word containment stays meaningful. */
export function normalizePhraseForNearMiss(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Packed key for phrase-bank collision checks (matches normalizeAnswerKey). */
function packedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hasWordBoundaryAround(haystack: string, start: number, length: number): boolean {
  const before = start === 0 ? " " : haystack[start - 1];
  const after = start + length >= haystack.length ? " " : haystack[start + length];
  const boundary = /[\s\-_/]/;
  return Boolean(before && after && boundary.test(before) && boundary.test(after));
}

function isContiguousPhraseMatch(haystack: string, needle: string): boolean {
  if (!haystack || !needle || haystack === needle) return false;
  if (needle.length < 3) return false;
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx < 0) return false;
    if (hasWordBoundaryAround(haystack, idx, needle.length)) return true;
    from = idx + 1;
  }
  return false;
}

function singularPluralCousins(a: string, b: string): boolean {
  if (a === b) return false;
  const endsWithS = (s: string) => s.endsWith("s") && s.length > 3;
  if (endsWithS(a) && a.slice(0, -1) === b) return true;
  if (endsWithS(b) && b.slice(0, -1) === a) return true;
  if (a.endsWith("ies") && `${a.slice(0, -3)}y` === b) return true;
  if (b.endsWith("ies") && `${b.slice(0, -3)}y` === a) return true;
  return false;
}

/**
 * Returns near-miss phrases that would still be "close enough" solvers for this answer.
 */
export function findAnswerNearMisses(answer: string, candidates: readonly string[]): string[] {
  const spaced = normalizePhraseForNearMiss(answer);
  const packed = packedKey(answer);
  if (!spaced || packed.length < 3) return [];

  const hits = new Set<string>();
  for (const candidate of candidates) {
    const cSpaced = normalizePhraseForNearMiss(candidate);
    const cPacked = packedKey(candidate);
    if (!cSpaced || !cPacked || cPacked === packed) continue;

    // Multi-word idiom cousins only ("hold on" ⊂ "hold on tight").
    // Do not treat single tokens inside longer idioms as collisions — that
    // false-positives "moon" vs "once in a blue moon" and compounds like
    // sunflower/flower.
    const spacedIsMulti = spaced.includes(" ");
    const candidateIsMulti = cSpaced.includes(" ");
    if (spacedIsMulti && candidateIsMulti) {
      if (isContiguousPhraseMatch(spaced, cSpaced) || isContiguousPhraseMatch(cSpaced, spaced)) {
        hits.add(candidate);
        continue;
      }
      if (cSpaced.startsWith(`${spaced} `) || spaced.startsWith(`${cSpaced} `)) {
        hits.add(candidate);
        continue;
      }
    }
    if (singularPluralCousins(packed, cPacked)) {
      hits.add(candidate);
    }
  }
  return [...hits].sort((a, b) => a.localeCompare(b));
}

export function evaluateNearMissStress(input: {
  answer: string;
  extraCandidates?: readonly string[];
  /** When false, only score `extraCandidates` (used after blind-solve wrong parses). */
  includePhraseBank?: boolean;
}): NearMissStressResult {
  const bank = input.includePhraseBank === false ? [] : PHRASE_BANK.map((entry) => entry.answer);
  const candidates = [...new Set([...(input.extraCandidates ?? []), ...bank])];
  const nearMisses = findAnswerNearMisses(input.answer, candidates).filter(
    (phrase) => normalizePhraseForNearMiss(phrase) !== normalizePhraseForNearMiss(input.answer)
  );

  if (nearMisses.length === 0) {
    return { ok: true, issues: [], nearMisses: [] };
  }

  const preview = nearMisses.slice(0, 6).join(", ");
  return {
    ok: false,
    issues: [
      `Near-miss stress failed: "${input.answer}" collides with close alternate(s): ${preview}`,
    ],
    nearMisses,
  };
}
