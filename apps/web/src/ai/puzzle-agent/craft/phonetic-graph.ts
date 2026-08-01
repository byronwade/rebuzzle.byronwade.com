/**
 * Local phonetic graph — drawable sound cues → spoken syllables.
 * Complements Datamuse with rebus-proven edges.
 */

export type PhoneticEdge = {
  /** Spoken sound / syllable */
  sound: string;
  /** Drawable pictogram concept */
  cue: string;
  /** Example answers that use this leap */
  examples?: string[];
};

export const PHONETIC_EDGES: readonly PhoneticEdge[] = [
  { sound: "be", cue: "bee", examples: ["belief", "before", "beyond"] },
  { sound: "see", cue: "eye", examples: ["seasick", "season"] },
  { sound: "i", cue: "eye", examples: ["idol", "idea"] },
  { sound: "you", cue: "ewe", examples: [] },
  { sound: "you", cue: "yew", examples: [] },
  { sound: "are", cue: "letter-r", examples: [] },
  { sound: "why", cue: "letter-y", examples: [] },
  { sound: "tea", cue: "tea", examples: ["tease", "team"] },
  { sound: "tee", cue: "golf-tee", examples: ["tease"] },
  { sound: "sea", cue: "wave", examples: ["seaside", "season"] },
  { sound: "sun", cue: "sun", examples: ["son", "sunday"] },
  { sound: "son", cue: "boy", examples: ["sun"] },
  { sound: "flour", cue: "wheat", examples: ["flower"] },
  { sound: "flower", cue: "flower", examples: ["flour"] },
  { sound: "knight", cue: "knight", examples: ["night"] },
  { sound: "night", cue: "moon", examples: ["knight"] },
  { sound: "pair", cue: "pair", examples: ["pear", "pare"] },
  { sound: "pear", cue: "pear", examples: ["pair"] },
  { sound: "right", cue: "arrow-right", examples: ["write", "rite"] },
  { sound: "write", cue: "pen", examples: ["right"] },
  { sound: "wait", cue: "hourglass", examples: ["weight"] },
  { sound: "weight", cue: "scale", examples: ["wait"] },
  { sound: "board", cue: "plank", examples: ["bored"] },
  { sound: "bored", cue: "yawn", examples: ["board"] },
  { sound: "mail", cue: "envelope", examples: ["male"] },
  { sound: "male", cue: "man", examples: ["mail"] },
  { sound: "plain", cue: "plain", examples: ["plane"] },
  { sound: "plane", cue: "plane", examples: ["plain"] },
  { sound: "peace", cue: "dove", examples: ["piece"] },
  { sound: "piece", cue: "puzzle-piece", examples: ["peace"] },
  { sound: "four", cue: "number-4", examples: ["for", "fore", "before"] },
  { sound: "ate", cue: "number-8", examples: ["eight"] },
  { sound: "won", cue: "number-1", examples: ["one"] },
  { sound: "too", cue: "number-2", examples: ["to", "two"] },
  { sound: "leaf", cue: "leaf", examples: ["belief"] },
  { sound: "ant", cue: "ant", examples: ["aunt"] },
  { sound: "bear", cue: "bear", examples: ["bare"] },
  { sound: "bare", cue: "foot", examples: ["bear"] },
] as const;

export type PhoneticSuggestion = {
  sound: string;
  cue: string;
  examples: string[];
};

export function lookupPhoneticCues(seed: string, limit = 6): PhoneticSuggestion[] {
  const key = seed.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!key) return [];

  const out: PhoneticSuggestion[] = [];
  const seen = new Set<string>();

  for (const edge of PHONETIC_EDGES) {
    const soundKey = edge.sound.replace(/[^a-z0-9]+/g, "");
    const hit =
      soundKey === key ||
      key.includes(soundKey) ||
      soundKey.includes(key) ||
      (edge.examples ?? []).some((ex) => ex.replace(/[^a-z0-9]+/g, "").includes(key));
    if (!hit) continue;
    const id = `${edge.sound}:${edge.cue}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      sound: edge.sound,
      cue: edge.cue,
      examples: edge.examples ?? [],
    });
    if (out.length >= limit) break;
  }

  return out;
}

export function formatPhoneticGraphForPrompt(suggestions: PhoneticSuggestion[]): string {
  if (!suggestions.length) {
    return "Phonetic graph: no local edges — use Datamuse homophones sparingly (one leap).";
  }
  return [
    "Phonetic graph (drawable cues → sounds; prefer ONE leap):",
    ...suggestions.map(
      (s) =>
        `  - ${s.cue} → "${s.sound}"${s.examples.length ? ` (e.g. ${s.examples.slice(0, 2).join(", ")})` : ""}`
    ),
  ].join("\n");
}
