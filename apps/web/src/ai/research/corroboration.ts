/**
 * Citation corroboration — the host, not the model, decides what is "verified".
 *
 * A synthesized claim survives only when it cites pages that a search call
 * really returned, those pages come from trusted or independent domains, and
 * any number in the claim (a year, a date, a count) literally appears in the
 * cited text. Everything else is kept for the audit trail but marked
 * unsupported so downstream writers never repeat it as fact.
 */

import { SOURCE_TIER_WEIGHT } from "./source-quality";
import type { ClaimSupport, ResearchClaim, ResearchSource } from "./types";

interface DraftClaim {
  statement: string;
  kind: string;
  sourceIds: string[];
}

const STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "been",
  "before",
  "from",
  "have",
  "into",
  "means",
  "meaning",
  "more",
  "most",
  "often",
  "other",
  "phrase",
  "since",
  "some",
  "such",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "used",
  "uses",
  "very",
  "were",
  "when",
  "which",
  "with",
  "word",
  "words",
  "would",
]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
}

/** Years, decades, and other figures a claim asserts (e.g. 1830, 1830s, 17th). */
export function extractClaimNumbers(statement: string): string[] {
  const matches = normalizeText(statement).match(/\b\d{2,4}(?:s|st|nd|rd|th)?\b/g) ?? [];
  return Array.from(new Set(matches.map((m) => m.replace(/(?:st|nd|rd|th)$/, ""))));
}

function significantWords(value: string): string[] {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(/[^a-z0-9']+/)
        .map((word) => word.replace(/'s$/, ""))
        .filter((word) => word.length >= 4 && !STOPWORDS.has(word))
    )
  );
}

/** Fraction of a claim's content words that appear in its cited evidence. */
export function lexicalOverlap(statement: string, evidence: string): number {
  const words = significantWords(statement);
  if (!words.length) return 1;
  const haystack = normalizeText(evidence);
  const hits = words.filter((word) =>
    haystack.includes(word.slice(0, Math.max(4, word.length - 2)))
  );
  return hits.length / words.length;
}

export function corroborateClaims(
  drafts: readonly DraftClaim[],
  sources: readonly ResearchSource[]
): { claims: ResearchClaim[]; droppedCitations: number } {
  const byId = new Map(sources.map((source) => [source.id.toUpperCase(), source]));
  let droppedCitations = 0;

  const claims = drafts
    .filter((draft) => draft.statement?.trim())
    .map((draft): ResearchClaim => {
      const notes: string[] = [];
      const cited: ResearchSource[] = [];
      for (const rawId of draft.sourceIds ?? []) {
        const source = byId.get(String(rawId).trim().toUpperCase());
        if (!source) {
          droppedCitations += 1;
          continue;
        }
        if (!cited.includes(source)) cited.push(source);
      }
      if (cited.length < (draft.sourceIds?.length ?? 0)) {
        notes.push("cited a source that was never retrieved");
      }

      // A citation only counts when its own text carries the claim's figures
      // and wording, so an unrelated reference page cannot vouch for an
      // assertion that only a low-trust page makes.
      const figures = extractClaimNumbers(draft.statement);
      const sourceText = (s: ResearchSource) => `${s.title} ${s.snippet}`;
      const missingEverywhere = figures.filter(
        (figure) => !cited.some((s) => normalizeText(sourceText(s)).includes(figure))
      );
      const supporting = cited.filter((s) => {
        const text = normalizeText(sourceText(s));
        return (
          figures.every((figure) => text.includes(figure)) &&
          lexicalOverlap(draft.statement, sourceText(s)) >= 0.2
        );
      });

      const bestWeightByDomain = new Map<string, number>();
      for (const source of supporting) {
        const weight = SOURCE_TIER_WEIGHT[source.tier];
        bestWeightByDomain.set(
          source.domain,
          Math.max(weight, bestWeightByDomain.get(source.domain) ?? 0)
        );
      }
      const trustedDomains = supporting.filter((s) => s.tier !== "low").map((s) => s.domain);
      const distinctTrusted = new Set(trustedDomains).size;
      const hasReference = supporting.some((s) => s.tier === "reference");

      const support: ClaimSupport =
        distinctTrusted >= 2 || hasReference
          ? "verified"
          : distinctTrusted === 1
            ? "single-source"
            : "unsupported";
      if (!cited.length) notes.push("no retrieved citation");
      else if (missingEverywhere.length) {
        notes.push(`figures not found in cited text: ${missingEverywhere.join(", ")}`);
      } else if (!supporting.length) notes.push("cited text barely overlaps the claim");
      else if (!distinctTrusted) notes.push("only low-trust sources");
      if (supporting.length < cited.length) {
        notes.push(`${cited.length - supporting.length} citation(s) do not state the claim`);
      }

      const confidence =
        1 - [...bestWeightByDomain.values()].reduce((acc, weight) => acc * (1 - weight * 0.7), 1);

      return {
        statement: draft.statement.trim(),
        kind: draft.kind || "fact",
        sourceIds: supporting.map((s) => s.id),
        support,
        confidence: Math.round(Math.max(0, Math.min(1, confidence)) * 100) / 100,
        notes,
      };
    });

  return { claims, droppedCitations };
}

/** Claims a writer may state as fact. */
export function usableClaims(claims: readonly ResearchClaim[]): ResearchClaim[] {
  return claims.filter((claim) => claim.support !== "unsupported");
}
