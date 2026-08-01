/**
 * Curated phrase bank — high-quality rebus answer candidates.
 * Seeds invention; answers must still be fresh vs recent catalog.
 */

import type { TechniqueId } from "../technique-library";
import type { PhraseBankEntry } from "./types";

export const PHRASE_BANK: readonly PhraseBankEntry[] = [
  // Compounds
  {
    answer: "sunflower",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    overused: true,
  },
  {
    answer: "moonlight",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "multi_emoji_compound"],
  },
  {
    answer: "butterfly",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound"],
  },
  {
    answer: "firefly",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "multi_emoji_compound"],
  },
  {
    answer: "rainbow",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound", "basic_positional"],
  },
  {
    answer: "bookmark",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "idiom_as_picture"],
  },
  {
    answer: "hotdog",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound", "false_lead_visual"],
  },
  {
    answer: "skylight",
    category: "compound",
    difficultyHint: 6,
    techniqueAffinity: ["simple_compound", "positional_phrase"],
  },
  {
    answer: "handshake",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "idiom_as_picture"],
  },
  {
    answer: "waterfall",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "basic_positional"],
  },

  // Phonetic
  {
    answer: "before",
    category: "phonetic",
    difficultyHint: 5,
    techniqueAffinity: ["obvious_emoji_sum", "single_homophone"],
    notes: "bee + four",
    overused: true,
  },
  {
    answer: "belief",
    category: "phonetic",
    difficultyHint: 6,
    techniqueAffinity: ["nested_homophone", "multi_layer_phonetic"],
    notes: "bee + leaf",
    overused: true,
  },
  {
    answer: "season",
    category: "phonetic",
    difficultyHint: 6,
    techniqueAffinity: ["nested_homophone", "multi_layer_phonetic"],
    notes: "sea + son",
  },
  {
    answer: "ice cream",
    category: "phonetic",
    difficultyHint: 5,
    techniqueAffinity: ["single_homophone", "idiom_as_picture"],
    notes: "I scream",
  },
  {
    answer: "see you later",
    category: "phonetic",
    difficultyHint: 6,
    techniqueAffinity: ["multi_layer_phonetic", "idiom_as_picture"],
  },
  {
    answer: "forgive",
    category: "phonetic",
    difficultyHint: 7,
    techniqueAffinity: ["nested_homophone", "multi_layer_phonetic"],
    notes: "four + give / for + give",
  },

  // Positional / spatial
  {
    answer: "reading between the lines",
    category: "positional",
    difficultyHint: 6,
    techniqueAffinity: ["positional_phrase", "spatial_preposition_play"],
    overused: true,
  },
  {
    answer: "mind over matter",
    category: "positional",
    difficultyHint: 6,
    techniqueAffinity: ["math_symbol_wordplay", "positional_phrase"],
  },
  {
    answer: "head over heels",
    category: "positional",
    difficultyHint: 7,
    techniqueAffinity: ["positional_phrase", "spatial_preposition_play"],
  },
  {
    answer: "down to earth",
    category: "positional",
    difficultyHint: 6,
    techniqueAffinity: ["basic_positional", "spatial_preposition_play"],
  },
  {
    answer: "up in the air",
    category: "positional",
    difficultyHint: 5,
    techniqueAffinity: ["basic_positional", "idiom_as_picture"],
  },
  {
    answer: "on cloud nine",
    category: "positional",
    difficultyHint: 6,
    techniqueAffinity: ["positional_phrase", "idiom_as_picture"],
  },
  {
    answer: "under the weather",
    category: "positional",
    difficultyHint: 6,
    techniqueAffinity: ["spatial_preposition_play", "idiom_as_picture"],
  },
  {
    answer: "beside the point",
    category: "positional",
    difficultyHint: 7,
    techniqueAffinity: ["spatial_preposition_play", "false_lead_visual"],
  },
  {
    answer: "crossroads",
    category: "positional",
    difficultyHint: 5,
    techniqueAffinity: ["basic_positional", "simple_compound"],
  },

  // Idioms
  {
    answer: "piece of cake",
    category: "idiom",
    difficultyHint: 4,
    techniqueAffinity: ["idiom_as_picture", "simple_compound"],
    overused: true,
  },
  {
    answer: "spill the beans",
    category: "idiom",
    difficultyHint: 5,
    techniqueAffinity: ["idiom_as_picture"],
  },
  {
    answer: "break the ice",
    category: "idiom",
    difficultyHint: 5,
    techniqueAffinity: ["idiom_as_picture"],
  },
  {
    answer: "hit the nail on the head",
    category: "idiom",
    difficultyHint: 7,
    techniqueAffinity: ["idiom_as_picture", "triple_layer_composition"],
  },
  {
    answer: "barking up the wrong tree",
    category: "idiom",
    difficultyHint: 7,
    techniqueAffinity: ["rare_but_fair_idiom", "false_lead_visual"],
  },
  {
    answer: "once in a blue moon",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture", "multi_emoji_compound"],
    overused: true,
  },
  {
    answer: "cost an arm and a leg",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture", "multi_emoji_compound"],
  },
  {
    answer: "let the cat out of the bag",
    category: "idiom",
    difficultyHint: 7,
    techniqueAffinity: ["idiom_as_picture", "false_lead_visual"],
  },
  {
    answer: "the ball is in your court",
    category: "idiom",
    difficultyHint: 7,
    techniqueAffinity: ["rare_but_fair_idiom", "idiom_as_picture"],
  },
  {
    answer: "bite the bullet",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture"],
  },
  {
    answer: "cold shoulder",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture", "size_or_case_semantics"],
  },
  {
    answer: "silver lining",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture", "multi_emoji_compound"],
  },

  // Typography / size
  {
    answer: "big deal",
    category: "typography",
    difficultyHint: 5,
    techniqueAffinity: ["size_or_case_semantics"],
    overused: true,
  },
  {
    answer: "small talk",
    category: "typography",
    difficultyHint: 5,
    techniqueAffinity: ["size_or_case_semantics"],
  },
  {
    answer: "long shot",
    category: "typography",
    difficultyHint: 6,
    techniqueAffinity: ["size_or_case_semantics", "idiom_as_picture"],
  },
  {
    answer: "mixed feelings",
    category: "typography",
    difficultyHint: 7,
    techniqueAffinity: ["size_or_case_semantics", "false_lead_visual"],
  },
  {
    answer: "growing concern",
    category: "typography",
    difficultyHint: 7,
    techniqueAffinity: ["size_or_case_semantics", "triple_layer_composition"],
  },

  // Math / operators
  {
    answer: "times square",
    category: "math",
    difficultyHint: 6,
    techniqueAffinity: ["math_symbol_wordplay"],
  },
  {
    answer: "split second",
    category: "math",
    difficultyHint: 7,
    techniqueAffinity: ["math_symbol_wordplay", "size_or_case_semantics"],
  },
  {
    answer: "countdown",
    category: "math",
    difficultyHint: 5,
    techniqueAffinity: ["math_symbol_wordplay", "basic_positional"],
  },

  // Cultural / twist
  {
    answer: "jack of all trades",
    category: "cultural",
    difficultyHint: 8,
    techniqueAffinity: ["cultural_common_knowledge_plus_twist", "rare_but_fair_idiom"],
  },
  {
    answer: "pandora's box",
    category: "cultural",
    difficultyHint: 7,
    techniqueAffinity: ["cultural_common_knowledge_plus_twist", "idiom_as_picture"],
  },
  {
    answer: "trojan horse",
    category: "cultural",
    difficultyHint: 7,
    techniqueAffinity: ["cultural_common_knowledge_plus_twist", "false_lead_visual"],
  },
  {
    answer: "achilles heel",
    category: "cultural",
    difficultyHint: 7,
    techniqueAffinity: ["cultural_common_knowledge_plus_twist"],
  },
  {
    answer: "catch-22",
    category: "cultural",
    difficultyHint: 8,
    techniqueAffinity: ["recursive_visual_pun", "cultural_common_knowledge_plus_twist"],
  },

  // Evil / impossible lean
  {
    answer: "history repeating itself",
    category: "meta",
    difficultyHint: 8,
    techniqueAffinity: ["recursive_visual_pun", "triple_layer_composition"],
  },
  {
    answer: "a blessing in disguise",
    category: "idiom",
    difficultyHint: 8,
    techniqueAffinity: ["rare_but_fair_idiom", "false_lead_visual"],
  },
  {
    answer: "the tip of the iceberg",
    category: "idiom",
    difficultyHint: 7,
    techniqueAffinity: ["idiom_as_picture", "spatial_preposition_play"],
  },
  {
    answer: "walking on eggshells",
    category: "idiom",
    difficultyHint: 7,
    techniqueAffinity: ["idiom_as_picture", "multi_layer_phonetic"],
  },
  {
    answer: "elephant in the room",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture", "positional_phrase"],
  },
  {
    answer: "needle in a haystack",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture", "false_lead_visual"],
  },
  {
    answer: "two peas in a pod",
    category: "idiom",
    difficultyHint: 5,
    techniqueAffinity: ["idiom_as_picture", "multi_emoji_compound"],
  },
  {
    answer: "back to square one",
    category: "idiom",
    difficultyHint: 7,
    techniqueAffinity: ["math_symbol_wordplay", "positional_phrase"],
  },
  {
    answer: "out of the blue",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["spatial_preposition_play", "idiom_as_picture"],
  },
  {
    answer: "in the same boat",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["positional_phrase", "idiom_as_picture"],
  },
] as const;

function normalize(answer: string): string {
  return answer.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Sample phrase-bank entries matched to tier + techniques, excluding banned answers.
 */
export function samplePhraseBank(input: {
  targetDifficulty: number;
  preferredTechniques: string[];
  bannedAnswerKeys: Set<string>;
  theme?: string;
  category?: string;
  limit?: number;
}): PhraseBankEntry[] {
  const limit = input.limit ?? 8;
  const bandMin = Math.max(3, input.targetDifficulty - 2);
  const bandMax = Math.min(10, input.targetDifficulty + 2);
  const tech = new Set(input.preferredTechniques);
  const theme = input.theme?.toLowerCase();
  const category = input.category?.toLowerCase();

  const scored = PHRASE_BANK.map((entry) => {
    if (input.bannedAnswerKeys.has(normalize(entry.answer))) {
      return { entry, score: -Infinity };
    }
    let score = 0;
    if (entry.difficultyHint >= bandMin && entry.difficultyHint <= bandMax) score += 4;
    else score -= Math.abs(entry.difficultyHint - input.targetDifficulty);

    const affinityHits = entry.techniqueAffinity.filter((t) => tech.has(t)).length;
    score += affinityHits * 3;

    if (category && entry.category === category) score += 2;
    if (theme && (entry.answer.includes(theme) || entry.notes?.includes(theme))) score += 2;

    // Prefer fresher answers — overused tropes are anti-inspiration
    if (entry.overused) score -= 5;

    // Mild randomness so dailies don't always pick the same top seeds
    score += Math.random() * 1.5;
    return { entry, score };
  })
    .filter((s) => s.score > -Infinity)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.entry);
}

export function phraseBankSize(): number {
  return PHRASE_BANK.length;
}
