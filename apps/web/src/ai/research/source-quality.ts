/**
 * Deterministic source trust scoring.
 *
 * The research model never decides how much a page is worth: the host ranks
 * each retrieved URL by its registrable domain so dictionaries and
 * encyclopedias outrank forums, social posts, and puzzle-answer farms.
 */

import type { ResearchSource, SourceTier } from "./types";

/** Dictionaries, etymology references, encyclopedias, and phrase references. */
const REFERENCE_DOMAINS = [
  "merriam-webster.com",
  "oed.com",
  "oxfordlearnersdictionaries.com",
  "oxfordreference.com",
  "cambridge.org",
  "collinsdictionary.com",
  "dictionary.com",
  "thesaurus.com",
  "vocabulary.com",
  "ahdictionary.com",
  "wordnik.com",
  "wiktionary.org",
  "etymonline.com",
  "phrases.org.uk",
  "phrase-finder.org",
  "britannica.com",
  "wikipedia.org",
  "worldwidewords.org",
  "grammarist.com",
  "thefreedictionary.com",
  "theidioms.com",
  "macmillandictionary.com",
  "longmandictionary.com",
  "ldoceonline.com",
  "loc.gov",
  "si.edu",
  "archive.org",
] as const;

/** Established publishers with editorial standards. */
const EDITORIAL_DOMAINS = [
  "bbc.co.uk",
  "bbc.com",
  "nytimes.com",
  "theguardian.com",
  "npr.org",
  "washingtonpost.com",
  "theatlantic.com",
  "newyorker.com",
  "smithsonianmag.com",
  "nationalgeographic.com",
  "history.com",
  "mentalfloss.com",
  "atlasobscura.com",
  "reuters.com",
  "apnews.com",
  "economist.com",
  "time.com",
  "slate.com",
  "vox.com",
  "pbs.org",
  "dailywritingtips.com",
  "writingexplained.org",
] as const;

/**
 * User-generated, social, homework, and puzzle-answer sites: useful for
 * popularity signals at best, never sufficient to verify a fact.
 */
const LOW_TRUST_DOMAINS = [
  "reddit.com",
  "quora.com",
  "pinterest.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "medium.com",
  "answers.com",
  "brainly.com",
  "chegg.com",
  "coursehero.com",
  "fandom.com",
  "urbandictionary.com",
  "wordplays.com",
  "dailyanswers.com",
  "puzzle-solver.com",
  "crosswordsolver.org",
  "crossword-solver.io",
  "wordhippo.com",
  "rebuspuzzles.com",
  "rebus1.com",
  "riddles.com",
  "goodriddlesnow.com",
] as const;

/** Second-level labels that form a public suffix with the TLD (`co.uk`). */
const COMPOUND_SUFFIX_LABELS = new Set(["co", "com", "org", "net", "ac", "gov", "edu", "ltd"]);

export function registrableDomain(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
  host = host.replace(/^www\d?\./, "").replace(/\.$/, "");
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return labels.join(".");
  const secondLevel = labels[labels.length - 2] ?? "";
  const tld = labels[labels.length - 1] ?? "";
  const take = COMPOUND_SUFFIX_LABELS.has(secondLevel) && tld.length === 2 ? 3 : 2;
  return labels.slice(-take).join(".");
}

function matchesDomain(domain: string, list: readonly string[]): boolean {
  return list.some((entry) => domain === entry || domain.endsWith(`.${entry}`));
}

export function classifySourceDomain(domain: string): SourceTier {
  if (!domain) return "low";
  if (matchesDomain(domain, LOW_TRUST_DOMAINS)) return "low";
  if (matchesDomain(domain, REFERENCE_DOMAINS)) return "reference";
  if (/\.(gov|edu|mil)$/.test(domain) || /\.(gov|ac|edu)\.[a-z]{2}$/.test(domain)) {
    return "reference";
  }
  if (matchesDomain(domain, EDITORIAL_DOMAINS)) return "editorial";
  return "general";
}

export const SOURCE_TIER_WEIGHT: Record<SourceTier, number> = {
  reference: 1,
  editorial: 0.8,
  general: 0.5,
  low: 0.15,
};

/** Canonical URL used to dedupe the same page found by different queries. */
export function canonicalUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|ref$|ref_src$)/i.test(key)) parsed.searchParams.delete(key);
    }
    const path = parsed.pathname.replace(/\/+$/, "");
    const query = parsed.searchParams.toString();
    return `${parsed.hostname.toLowerCase().replace(/^www\d?\./, "")}${path}${query ? `?${query}` : ""}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export interface RawSearchHit {
  url: string;
  title?: string;
  snippet?: string;
  publishedAt?: string;
}

/**
 * Dedupe, classify, rank, and number retrieved pages. Reference sources come
 * first; at most `perDomain` pages from one domain survive so a single site
 * cannot pose as corroboration.
 */
export function rankResearchSources(
  hits: readonly RawSearchHit[],
  options: { limit?: number; perDomain?: number; snippetChars?: number } = {}
): ResearchSource[] {
  const limit = options.limit ?? 14;
  const perDomain = options.perDomain ?? 2;
  const snippetChars = options.snippetChars ?? 700;
  const seen = new Map<string, RawSearchHit & { order: number }>();

  hits.forEach((hit, order) => {
    if (!hit?.url || !/^https?:\/\//i.test(hit.url)) return;
    const key = canonicalUrl(hit.url);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, { ...hit, order });
      return;
    }
    // Keep the richer snippet when two queries return the same page.
    if ((hit.snippet?.length ?? 0) > (existing.snippet?.length ?? 0)) {
      seen.set(key, { ...existing, snippet: hit.snippet, title: existing.title || hit.title });
    }
  });

  const ranked = [...seen.values()]
    .map((hit) => {
      const domain = registrableDomain(hit.url);
      return { hit, domain, tier: classifySourceDomain(domain) };
    })
    .filter((entry) => entry.domain)
    .sort(
      (a, b) => SOURCE_TIER_WEIGHT[b.tier] - SOURCE_TIER_WEIGHT[a.tier] || a.hit.order - b.hit.order
    );

  const perDomainCount = new Map<string, number>();
  const sources: ResearchSource[] = [];
  for (const entry of ranked) {
    if (sources.length >= limit) break;
    const used = perDomainCount.get(entry.domain) ?? 0;
    if (used >= perDomain) continue;
    perDomainCount.set(entry.domain, used + 1);
    sources.push({
      id: `S${sources.length + 1}`,
      url: entry.hit.url,
      title: (entry.hit.title || entry.domain).replace(/\s+/g, " ").trim().slice(0, 200),
      snippet: (entry.hit.snippet || "").replace(/\s+/g, " ").trim().slice(0, snippetChars),
      domain: entry.domain,
      tier: entry.tier,
      ...(entry.hit.publishedAt ? { publishedAt: entry.hit.publishedAt } : {}),
    });
  }
  return sources;
}
