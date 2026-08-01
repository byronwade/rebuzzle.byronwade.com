/**
 * Datamuse API — lexical intelligence for smarter rebus invention.
 * https://www.datamuse.com/api/
 *
 * Free, no key required (fair-use). Cache short-lived results.
 */

export type DatamuseWord = {
  word: string;
  score?: number;
  numSyllables?: number;
  tags?: string[];
};

export type WordplayExpansion = {
  seed: string;
  meansLike: string[];
  soundsLike: string[];
  homophones: string[];
  rhymes: string[];
  triggers: string[];
  synonyms: string[];
};

type CacheEntry = { at: number; data: DatamuseWord[] };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function datamuseWords(
  params: Record<string, string>,
  max = 8
): Promise<DatamuseWord[]> {
  const qs = new URLSearchParams({ ...params, max: String(max) });
  const key = qs.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  try {
    const res = await fetch(`https://api.datamuse.com/words?${key}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as DatamuseWord[];
    const words = Array.isArray(data) ? data : [];
    cache.set(key, { at: Date.now(), data: words });
    return words;
  } catch {
    return [];
  }
}

function justWords(rows: DatamuseWord[], limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const w = row.word?.toLowerCase().trim();
    if (!w || w.length < 2 || w.length > 24) continue;
    if (seen.has(w)) continue;
    // Skip single letters / noise for rebus use
    if (/^[a-z]$/.test(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Expand a seed into phonetic/semantic neighbors for rebus mechanisms.
 */
export async function expandWordplay(
  seed: string,
  limit = 6
): Promise<WordplayExpansion> {
  const clean = seed.trim().slice(0, 40);
  if (!clean) {
    return {
      seed: "",
      meansLike: [],
      soundsLike: [],
      homophones: [],
      rhymes: [],
      triggers: [],
      synonyms: [],
    };
  }

  const [meansLike, soundsLike, homophones, rhymes, triggers, synonyms] =
    await Promise.all([
      datamuseWords({ ml: clean }, limit),
      datamuseWords({ sl: clean }, limit),
      datamuseWords({ rel_hom: clean }, limit),
      datamuseWords({ rel_rhy: clean }, limit),
      datamuseWords({ rel_trg: clean }, limit),
      datamuseWords({ rel_syn: clean }, limit),
    ]);

  return {
    seed: clean,
    meansLike: justWords(meansLike, limit),
    soundsLike: justWords(soundsLike, limit),
    homophones: justWords(homophones, limit),
    rhymes: justWords(rhymes, limit),
    triggers: justWords(triggers, limit),
    synonyms: justWords(synonyms, limit),
  };
}

/**
 * Compact prompt block for Eve / concept seeding.
 */
export function formatWordplayForPrompt(expansion: WordplayExpansion): string {
  const lines = [
    `Wordplay around "${expansion.seed}":`,
    expansion.homophones.length
      ? `  Homophones: ${expansion.homophones.join(", ")}`
      : null,
    expansion.soundsLike.length
      ? `  Sounds-like: ${expansion.soundsLike.join(", ")}`
      : null,
    expansion.rhymes.length ? `  Rhymes: ${expansion.rhymes.join(", ")}` : null,
    expansion.meansLike.length
      ? `  Related meaning: ${expansion.meansLike.slice(0, 5).join(", ")}`
      : null,
    expansion.triggers.length
      ? `  Associations: ${expansion.triggers.slice(0, 5).join(", ")}`
      : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function resetDatamuseCache(): void {
  cache.clear();
}
