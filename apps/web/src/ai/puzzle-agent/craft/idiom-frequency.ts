/**
 * Idiom recognition frequency — gate rare_but_fair / cultural techniques.
 * frequency: 1 = niche, 5 = everyone knows it.
 */

export type IdiomEntry = {
  phrase: string;
  frequency: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
};

export const IDIOM_FREQUENCY: readonly IdiomEntry[] = [
  { phrase: "piece of cake", frequency: 5, tags: ["overused"] },
  { phrase: "spill the tea", frequency: 4, tags: ["modern"] },
  { phrase: "break the ice", frequency: 5 },
  { phrase: "hit the nail on the head", frequency: 4 },
  { phrase: "under the weather", frequency: 5 },
  { phrase: "once in a blue moon", frequency: 4, tags: ["overused"] },
  { phrase: "cost an arm and a leg", frequency: 4 },
  { phrase: "barking up the wrong tree", frequency: 3 },
  { phrase: "bite the bullet", frequency: 4 },
  { phrase: "let the cat out of the bag", frequency: 4 },
  { phrase: "raining cats and dogs", frequency: 4, tags: ["overused"] },
  { phrase: "the ball is in your court", frequency: 3 },
  { phrase: "burn the midnight oil", frequency: 3 },
  { phrase: "catch someone red-handed", frequency: 3 },
  { phrase: "cut corners", frequency: 4 },
  { phrase: "get cold feet", frequency: 4 },
  { phrase: "hit the ground running", frequency: 3 },
  { phrase: "keep an eye on", frequency: 5 },
  { phrase: "on thin ice", frequency: 4 },
  { phrase: "out of the blue", frequency: 4 },
  { phrase: "pull someone's leg", frequency: 4 },
  { phrase: "read between the lines", frequency: 4 },
  { phrase: "see eye to eye", frequency: 4 },
  { phrase: "sit on the fence", frequency: 3 },
  { phrase: "steal someone's thunder", frequency: 3 },
  { phrase: "the last straw", frequency: 4 },
  { phrase: "throw in the towel", frequency: 4 },
  { phrase: "turn over a new leaf", frequency: 3 },
  { phrase: "when pigs fly", frequency: 4 },
  { phrase: "a blessing in disguise", frequency: 3 },
  { phrase: "beat around the bush", frequency: 4 },
  { phrase: "call it a day", frequency: 5 },
  { phrase: "cross that bridge when you come to it", frequency: 3 },
  { phrase: "don't cry over spilled milk", frequency: 4 },
  { phrase: "head over heels", frequency: 4 },
  { phrase: "in hot water", frequency: 4 },
  { phrase: "jump on the bandwagon", frequency: 3 },
  { phrase: "kill two birds with one stone", frequency: 4, tags: ["sensitive"] },
  { phrase: "leave no stone unturned", frequency: 3 },
  { phrase: "miss the boat", frequency: 3 },
  { phrase: "on cloud nine", frequency: 4 },
  { phrase: "play it by ear", frequency: 3 },
  { phrase: "speak of the devil", frequency: 4 },
  { phrase: "take it with a grain of salt", frequency: 3 },
  { phrase: "the elephant in the room", frequency: 4 },
  { phrase: "through thick and thin", frequency: 3 },
  { phrase: "up in the air", frequency: 4 },
  { phrase: "wear your heart on your sleeve", frequency: 3 },
  { phrase: "you can't judge a book by its cover", frequency: 4 },
  { phrase: "add fuel to the fire", frequency: 3 },
] as const;

function normalize(phrase: string): string {
  return phrase.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

export function lookupIdiomFrequency(phrase: string): IdiomEntry | null {
  const key = normalize(phrase);
  if (!key) return null;
  return IDIOM_FREQUENCY.find((e) => normalize(e.phrase) === key) ?? null;
}

/**
 * Fair for daily Impossible if frequency ≥ minFreq (default 3).
 */
export function isIdiomFairForDaily(
  phrase: string,
  minFreq = 3
): { ok: boolean; frequency: number | null; reason?: string } {
  const entry = lookupIdiomFrequency(phrase);
  if (!entry) {
    return {
      ok: false,
      frequency: null,
      reason: "Idiom not in frequency corpus — prefer well-known phrases",
    };
  }
  if (entry.tags?.includes("sensitive")) {
    return { ok: false, frequency: entry.frequency, reason: "Avoid sensitive idiom variants" };
  }
  if (entry.frequency < minFreq) {
    return {
      ok: false,
      frequency: entry.frequency,
      reason: `Idiom frequency ${entry.frequency} below min ${minFreq}`,
    };
  }
  return { ok: true, frequency: entry.frequency };
}

export function sampleFairIdioms(input?: {
  minFreq?: number;
  maxFreq?: number;
  limit?: number;
  excludeOverused?: boolean;
}): string[] {
  const minFreq = input?.minFreq ?? 3;
  const maxFreq = input?.maxFreq ?? 5;
  const limit = input?.limit ?? 8;
  const excludeOverused = input?.excludeOverused !== false;

  return IDIOM_FREQUENCY.filter((e) => {
    if (e.frequency < minFreq || e.frequency > maxFreq) return false;
    if (excludeOverused && e.tags?.includes("overused")) return false;
    if (e.tags?.includes("sensitive")) return false;
    return true;
  })
    .slice(0, limit)
    .map((e) => e.phrase);
}
