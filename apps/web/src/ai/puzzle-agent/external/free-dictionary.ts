/**
 * Free Dictionary API — sense disambiguation for rebus pictogram nouns.
 * https://dictionaryapi.dev/
 */

export type WordSense = {
  word: string;
  partOfSpeech?: string;
  definition: string;
  synonyms: string[];
};

export type WordSenseResult = {
  word: string;
  senses: WordSense[];
  concreteNoun: boolean;
  promptBlock: string;
};

type CacheEntry = { at: number; data: WordSenseResult };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000;

const ABSTRACT_MARKERS =
  /\b(concept|quality|state of|feeling|abstract|philosophy|ideology)\b/i;

/**
 * Fetch senses; mark whether a concrete noun reading exists.
 */
export async function lookupWordSenses(word: string): Promise<WordSenseResult> {
  const clean = word.trim().toLowerCase().slice(0, 40);
  if (!clean || clean.includes(" ")) {
    return {
      word: clean,
      senses: [],
      concreteNoun: false,
      promptBlock: `Dictionary: "${clean}" skipped (need a single token).`,
    };
  }

  const hit = cache.get(clean);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(4000),
      }
    );
    if (!res.ok) {
      const empty: WordSenseResult = {
        word: clean,
        senses: [],
        concreteNoun: false,
        promptBlock: `Dictionary: no entry for "${clean}" — prefer a more concrete noun.`,
      };
      cache.set(clean, { at: Date.now(), data: empty });
      return empty;
    }

    const data = (await res.json()) as Array<{
      meanings?: Array<{
        partOfSpeech?: string;
        definitions?: Array<{ definition?: string; synonyms?: string[] }>;
      }>;
    }>;

    const senses: WordSense[] = [];
    for (const entry of data) {
      for (const meaning of entry.meanings ?? []) {
        for (const def of meaning.definitions ?? []) {
          if (!def.definition) continue;
          senses.push({
            word: clean,
            partOfSpeech: meaning.partOfSpeech,
            definition: def.definition.slice(0, 160),
            synonyms: (def.synonyms ?? []).slice(0, 4),
          });
          if (senses.length >= 6) break;
        }
        if (senses.length >= 6) break;
      }
      if (senses.length >= 6) break;
    }

    const nounSenses = senses.filter((s) => s.partOfSpeech === "noun");
    const concreteNoun = nounSenses.some(
      (s) => !ABSTRACT_MARKERS.test(s.definition)
    );

    const result: WordSenseResult = {
      word: clean,
      senses,
      concreteNoun,
      promptBlock: [
        `Dictionary "${clean}":`,
        ...senses.slice(0, 3).map(
          (s) => `  - (${s.partOfSpeech ?? "?"}) ${s.definition}`
        ),
        concreteNoun
          ? "  → Has a concrete noun reading — OK for pictogram."
          : "  → Weak/abstract as a pictogram — pick a more drawable object.",
      ].join("\n"),
    };
    cache.set(clean, { at: Date.now(), data: result });
    return result;
  } catch {
    return {
      word: clean,
      senses: [],
      concreteNoun: true, // don't block invent on network failure
      promptBlock: `Dictionary unavailable for "${clean}" — assume concrete if silhouette is clear.`,
    };
  }
}

export function resetDictionaryCache(): void {
  cache.clear();
}
