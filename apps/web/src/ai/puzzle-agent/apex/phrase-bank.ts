/**
 * Curated phrase bank — high-quality rebus answer candidates.
 * Seeds invention; answers must still be fresh vs recent catalog.
 */

import type { TechniqueId } from "../technique-library";
import { resolveCuratedPictogram } from "../visual/curated-pictograms";
import type { AnswerSeedVisualCue, AnswerSeedVisualCueRole, PhraseBankEntry } from "./types";

const catalogCue = (
  concept: string,
  role: AnswerSeedVisualCueRole = "word-part"
): AnswerSeedVisualCue => ({ kind: "catalog", concept, role });

const textCue = (
  content: string,
  role: AnswerSeedVisualCueRole = "word-part"
): AnswerSeedVisualCue => ({ kind: "text", content, role });

const operatorCue = (symbol: string): AnswerSeedVisualCue => ({
  kind: "operator",
  symbol,
  role: "structural-anchor",
});

export const PHRASE_BANK: readonly PhraseBankEntry[] = [
  // Compounds
  {
    answer: "sunflower",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    visualCues: [catalogCue("sun"), catalogCue("flower")],
    overused: true,
  },
  {
    answer: "moonlight",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "multi_emoji_compound"],
    visualCues: [catalogCue("moon"), catalogCue("lightbulb")],
  },
  {
    answer: "butterfly",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound"],
    visualCues: [textCue("BUTTER"), textCue("FLY")],
  },
  {
    answer: "firefly",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "multi_emoji_compound"],
    visualCues: [catalogCue("fire"), textCue("FLY")],
  },
  {
    answer: "rainbow",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound", "basic_positional"],
    visualCues: [textCue("RAIN"), textCue("BOW")],
  },
  {
    answer: "bookmark",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "idiom_as_picture"],
    visualCues: [catalogCue("book"), textCue("MARK")],
  },
  {
    answer: "hotdog",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound", "false_lead_visual"],
    visualCues: [textCue("HOT"), catalogCue("dog")],
  },
  {
    answer: "skylight",
    category: "compound",
    difficultyHint: 6,
    techniqueAffinity: ["simple_compound", "positional_phrase"],
    visualCues: [textCue("SKY"), catalogCue("lightbulb")],
  },
  {
    answer: "handshake",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "idiom_as_picture"],
    visualCues: [catalogCue("hand"), textCue("SHAKE")],
  },
  {
    answer: "waterfall",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "basic_positional"],
    visualCues: [textCue("WATER"), textCue("FALL")],
  },
  {
    answer: "flowerpot",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    notes: "flower + pot",
    visualCues: [catalogCue("flower"), catalogCue("cooking-pot")],
  },
  {
    answer: "houseboat",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    notes: "house + boat",
    visualCues: [catalogCue("house"), catalogCue("boat")],
  },
  {
    answer: "starfish",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    notes: "star + fish",
    visualCues: [catalogCue("star"), catalogCue("fish")],
  },
  {
    answer: "seashell",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    notes: "sea + shell",
    visualCues: [textCue("SEA"), textCue("SHELL")],
  },
  {
    answer: "cupcake",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    notes: "cup + cake",
    visualCues: [textCue("CUP"), textCue("CAKE")],
  },
  {
    answer: "dogfish",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    notes: "dog + fish",
    visualCues: [catalogCue("dog"), catalogCue("fish")],
  },
  {
    answer: "musicbox",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    notes: "music + box",
    visualCues: [catalogCue("music"), textCue("BOX")],
  },
  {
    answer: "firehouse",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    notes: "fire + house",
    visualCues: [catalogCue("fire"), catalogCue("house")],
  },
  {
    answer: "coffeehouse",
    category: "compound",
    difficultyHint: 4,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    notes: "coffee + house",
    visualCues: [textCue("COFFEE"), catalogCue("house")],
  },
  {
    answer: "flowerbox",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    notes: "flower + box",
    visualCues: [catalogCue("flower"), textCue("BOX")],
  },
  {
    answer: "fishcake",
    category: "compound",
    difficultyHint: 5,
    techniqueAffinity: ["simple_compound", "obvious_emoji_sum"],
    notes: "fish + cake",
    visualCues: [catalogCue("fish"), textCue("CAKE")],
  },

  // Phonetic
  {
    answer: "before",
    category: "phonetic",
    difficultyHint: 5,
    techniqueAffinity: ["obvious_emoji_sum", "single_homophone"],
    notes: "bee + four",
    visualCues: [textCue("BEE", "phonetic-anchor"), textCue("FOUR", "phonetic-anchor")],
    overused: true,
  },
  {
    answer: "belief",
    category: "phonetic",
    difficultyHint: 6,
    techniqueAffinity: ["nested_homophone", "multi_layer_phonetic"],
    notes: "bee + leaf",
    visualCues: [textCue("B", "phonetic-anchor"), catalogCue("leaf", "phonetic-anchor")],
    overused: true,
  },
  {
    answer: "season",
    category: "phonetic",
    difficultyHint: 6,
    techniqueAffinity: ["nested_homophone", "multi_layer_phonetic"],
    notes: "sea + son",
    visualCues: [textCue("SEA", "phonetic-anchor"), textCue("SON", "phonetic-anchor")],
  },
  {
    answer: "ice cream",
    category: "phonetic",
    difficultyHint: 5,
    techniqueAffinity: ["single_homophone", "idiom_as_picture"],
    notes: "I scream",
    visualCues: [catalogCue("snowflake", "phonetic-anchor"), textCue("CREAM")],
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
    visualCues: [textCue("FOUR", "phonetic-anchor"), catalogCue("gift", "phonetic-anchor")],
  },
  {
    answer: "knight",
    category: "phonetic",
    difficultyHint: 5,
    techniqueAffinity: ["single_homophone"],
    notes: "night / knight",
    visualCues: [catalogCue("sword", "semantic-anchor"), textCue("NIGHT", "phonetic-anchor")],
  },
  {
    answer: "flower",
    category: "phonetic",
    difficultyHint: 5,
    techniqueAffinity: ["single_homophone"],
    notes: "flour / flower",
    visualCues: [catalogCue("wheat", "phonetic-anchor"), textCue("FLOUR", "phonetic-anchor")],
  },
  {
    answer: "pair",
    category: "phonetic",
    difficultyHint: 5,
    techniqueAffinity: ["single_homophone"],
    notes: "pear / pair",
    visualCues: [textCue("PEAR", "phonetic-anchor")],
  },

  // Positional / spatial
  {
    answer: "reading between the lines",
    category: "positional",
    difficultyHint: 6,
    techniqueAffinity: ["positional_phrase", "spatial_preposition_play"],
    visualCues: [
      catalogCue("book", "semantic-anchor"),
      textCue("BETWEEN", "structural-anchor"),
      textCue("LINES", "word-part"),
    ],
    overused: true,
  },
  {
    answer: "mind over matter",
    category: "positional",
    difficultyHint: 6,
    techniqueAffinity: ["math_symbol_wordplay", "positional_phrase"],
    visualCues: [
      catalogCue("brain", "semantic-anchor"),
      textCue("OVER", "structural-anchor"),
      textCue("MATTER"),
    ],
  },
  {
    answer: "head over heels",
    category: "positional",
    difficultyHint: 7,
    techniqueAffinity: ["positional_phrase", "spatial_preposition_play"],
    visualCues: [
      textCue("HEAD", "semantic-anchor"),
      textCue("OVER", "structural-anchor"),
      catalogCue("footprints", "semantic-anchor"),
    ],
  },
  {
    answer: "down to earth",
    category: "positional",
    difficultyHint: 6,
    techniqueAffinity: ["basic_positional", "spatial_preposition_play"],
    visualCues: [
      textCue("DOWN", "structural-anchor"),
      textCue("TO"),
      catalogCue("globe", "semantic-anchor"),
    ],
  },
  {
    answer: "up in the air",
    category: "positional",
    difficultyHint: 5,
    techniqueAffinity: ["basic_positional", "idiom_as_picture"],
    visualCues: [
      textCue("UP", "structural-anchor"),
      textCue("IN", "structural-anchor"),
      textCue("AIR"),
    ],
  },
  {
    answer: "on cloud nine",
    category: "positional",
    difficultyHint: 6,
    techniqueAffinity: ["positional_phrase", "idiom_as_picture"],
    visualCues: [textCue("ON", "structural-anchor"), textCue("NINE"), textCue("CLOUD")],
  },
  {
    answer: "under the weather",
    category: "positional",
    difficultyHint: 6,
    techniqueAffinity: ["spatial_preposition_play", "idiom_as_picture"],
    visualCues: [textCue("UNDER", "structural-anchor"), catalogCue("rain", "semantic-anchor")],
  },
  {
    answer: "beside the point",
    category: "positional",
    difficultyHint: 7,
    techniqueAffinity: ["spatial_preposition_play", "false_lead_visual"],
    visualCues: [textCue("BESIDE", "structural-anchor"), textCue("POINT")],
  },
  {
    answer: "crossroads",
    category: "positional",
    difficultyHint: 5,
    techniqueAffinity: ["basic_positional", "simple_compound"],
    visualCues: [textCue("CROSS"), textCue("ROADS")],
  },

  // Idioms
  {
    answer: "piece of cake",
    category: "idiom",
    difficultyHint: 4,
    techniqueAffinity: ["idiom_as_picture", "simple_compound"],
    visualCues: [textCue("PIECE"), textCue("CAKE")],
    overused: true,
  },
  {
    answer: "spill the beans",
    category: "idiom",
    difficultyHint: 5,
    techniqueAffinity: ["idiom_as_picture"],
    visualCues: [textCue("WATER", "semantic-anchor"), textCue("SPILL"), textCue("BEANS")],
  },
  {
    answer: "break the ice",
    category: "idiom",
    difficultyHint: 5,
    techniqueAffinity: ["idiom_as_picture"],
    visualCues: [catalogCue("snowflake", "semantic-anchor"), textCue("BREAK"), textCue("THE")],
  },
  {
    answer: "hit the nail on the head",
    category: "idiom",
    difficultyHint: 7,
    techniqueAffinity: ["idiom_as_picture", "triple_layer_composition"],
    visualCues: [catalogCue("hammer", "semantic-anchor"), textCue("NAIL"), textCue("HEAD")],
  },
  {
    answer: "barking up the wrong tree",
    category: "idiom",
    difficultyHint: 7,
    techniqueAffinity: ["rare_but_fair_idiom", "false_lead_visual"],
    visualCues: [
      catalogCue("dog", "semantic-anchor"),
      textCue("UP", "structural-anchor"),
      catalogCue("tree"),
    ],
  },
  {
    answer: "once in a blue moon",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture", "multi_emoji_compound"],
    visualCues: [textCue("ONCE"), textCue("BLUE"), catalogCue("moon", "semantic-anchor")],
    overused: true,
  },
  {
    answer: "cost an arm and a leg",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture", "multi_emoji_compound"],
    visualCues: [
      textCue("COST"),
      catalogCue("hand", "semantic-anchor"),
      catalogCue("footprints", "semantic-anchor"),
    ],
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
    visualCues: [textCue("BALL"), textCue("COURT"), textCue("IN", "structural-anchor")],
  },
  {
    answer: "bite the bullet",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture"],
    visualCues: [textCue("BITE"), textCue("BULLET")],
  },
  {
    answer: "cold shoulder",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture", "size_or_case_semantics"],
    visualCues: [catalogCue("snowflake", "semantic-anchor"), textCue("SHOULDER")],
  },
  {
    answer: "silver lining",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture", "multi_emoji_compound"],
    visualCues: [catalogCue("diamond", "semantic-anchor"), textCue("LINING")],
  },

  // Typography / size
  {
    answer: "big deal",
    category: "typography",
    difficultyHint: 5,
    techniqueAffinity: ["size_or_case_semantics"],
    visualCues: [textCue("BIG"), textCue("DEAL")],
    overused: true,
  },
  {
    answer: "small talk",
    category: "typography",
    difficultyHint: 5,
    techniqueAffinity: ["size_or_case_semantics"],
    visualCues: [textCue("SMALL"), textCue("TALK")],
  },
  {
    answer: "long shot",
    category: "typography",
    difficultyHint: 6,
    techniqueAffinity: ["size_or_case_semantics", "idiom_as_picture"],
    visualCues: [textCue("LONG"), catalogCue("camera", "semantic-anchor")],
  },
  {
    answer: "mixed feelings",
    category: "typography",
    difficultyHint: 7,
    techniqueAffinity: ["size_or_case_semantics", "false_lead_visual"],
    visualCues: [textCue("MIXED", "structural-anchor"), catalogCue("heart", "semantic-anchor")],
  },
  {
    answer: "growing concern",
    category: "typography",
    difficultyHint: 7,
    techniqueAffinity: ["size_or_case_semantics", "triple_layer_composition"],
    visualCues: [catalogCue("sprout", "structural-anchor"), textCue("CONCERN")],
  },

  // Math / operators
  {
    answer: "times square",
    category: "math",
    difficultyHint: 6,
    techniqueAffinity: ["math_symbol_wordplay"],
    visualCues: [operatorCue("×"), textCue("SQUARE")],
  },
  {
    answer: "split second",
    category: "math",
    difficultyHint: 7,
    techniqueAffinity: ["math_symbol_wordplay", "size_or_case_semantics"],
    visualCues: [catalogCue("scissors", "structural-anchor"), textCue("SECOND")],
  },
  {
    answer: "countdown",
    category: "math",
    difficultyHint: 5,
    techniqueAffinity: ["math_symbol_wordplay", "basic_positional"],
    visualCues: [textCue("COUNT"), textCue("DOWN", "structural-anchor")],
  },

  // Cultural / twist
  {
    answer: "jack of all trades",
    category: "cultural",
    difficultyHint: 8,
    techniqueAffinity: ["cultural_common_knowledge_plus_twist", "rare_but_fair_idiom"],
    visualCues: [
      textCue("JACK"),
      textCue("ALL"),
      catalogCue("wrench", "semantic-anchor"),
      textCue("TRADES"),
    ],
  },
  {
    answer: "pandora's box",
    category: "cultural",
    difficultyHint: 7,
    techniqueAffinity: ["cultural_common_knowledge_plus_twist", "idiom_as_picture"],
    visualCues: [textCue("PANDORA"), textCue("BOX")],
  },
  {
    answer: "trojan horse",
    category: "cultural",
    difficultyHint: 7,
    techniqueAffinity: ["cultural_common_knowledge_plus_twist", "false_lead_visual"],
    visualCues: [textCue("TROJAN"), textCue("HORSE")],
  },
  {
    answer: "achilles heel",
    category: "cultural",
    difficultyHint: 7,
    techniqueAffinity: ["cultural_common_knowledge_plus_twist"],
    visualCues: [textCue("ACHILLES"), catalogCue("footprints", "semantic-anchor")],
  },
  {
    answer: "catch-22",
    category: "cultural",
    difficultyHint: 8,
    techniqueAffinity: ["recursive_visual_pun", "cultural_common_knowledge_plus_twist"],
    visualCues: [textCue("CATCH"), textCue("22")],
  },

  // Evil / impossible lean
  {
    answer: "history repeating itself",
    category: "meta",
    difficultyHint: 8,
    techniqueAffinity: ["recursive_visual_pun", "triple_layer_composition"],
    visualCues: [
      catalogCue("book", "semantic-anchor"),
      textCue("HISTORY"),
      textCue("REPEAT", "structural-anchor"),
    ],
  },
  {
    answer: "a blessing in disguise",
    category: "idiom",
    difficultyHint: 8,
    techniqueAffinity: ["rare_but_fair_idiom", "false_lead_visual"],
    visualCues: [catalogCue("gift", "semantic-anchor"), textCue("DISGUISE", "structural-anchor")],
  },
  {
    answer: "the tip of the iceberg",
    category: "idiom",
    difficultyHint: 7,
    techniqueAffinity: ["idiom_as_picture", "spatial_preposition_play"],
    visualCues: [textCue("TIP", "structural-anchor"), catalogCue("snowflake", "semantic-anchor")],
  },
  {
    answer: "walking on eggshells",
    category: "idiom",
    difficultyHint: 7,
    techniqueAffinity: ["idiom_as_picture", "multi_layer_phonetic"],
    visualCues: [catalogCue("footprints", "semantic-anchor"), catalogCue("egg"), textCue("SHELLS")],
  },
  {
    answer: "elephant in the room",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture", "positional_phrase"],
    visualCues: [textCue("ELEPHANT", "semantic-anchor"), textCue("ROOM", "structural-anchor")],
  },
  {
    answer: "needle in a haystack",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["idiom_as_picture", "false_lead_visual"],
    visualCues: [textCue("NEEDLE", "semantic-anchor"), catalogCue("wheat", "semantic-anchor")],
  },
  {
    answer: "two peas in a pod",
    category: "idiom",
    difficultyHint: 5,
    techniqueAffinity: ["idiom_as_picture", "multi_emoji_compound"],
    visualCues: [textCue("TWO"), textCue("PEAS"), textCue("POD")],
  },
  {
    answer: "back to square one",
    category: "idiom",
    difficultyHint: 7,
    techniqueAffinity: ["math_symbol_wordplay", "positional_phrase"],
    visualCues: [textCue("BACK", "structural-anchor"), textCue("SQUARE"), textCue("ONE")],
  },
  {
    answer: "out of the blue",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["spatial_preposition_play", "idiom_as_picture"],
    visualCues: [textCue("OUT", "structural-anchor"), textCue("BLUE")],
  },
  {
    answer: "in the same boat",
    category: "idiom",
    difficultyHint: 6,
    techniqueAffinity: ["positional_phrase", "idiom_as_picture"],
    visualCues: [textCue("SAME", "structural-anchor"), catalogCue("boat", "semantic-anchor")],
  },
] as const;

const phraseBankCuePlanIssues = PHRASE_BANK.flatMap((entry) =>
  (entry.visualCues ?? []).flatMap((cue) => {
    if (cue.kind !== "catalog") return [];
    return resolveCuratedPictogram(cue.concept)
      ? []
      : [`${entry.answer}: ${cue.concept} is not an approved catalog cue`];
  })
);

if (phraseBankCuePlanIssues.length) {
  throw new Error(`Invalid phrase-bank visual cue plan: ${phraseBankCuePlanIssues.join("; ")}`);
}

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
  /** Keep answer-first prompts free of classic tropes. */
  excludeOverused?: boolean;
  /** Keep strict answer-first prompts grounded by a host-owned cue plan. */
  requireVisualCuePlan?: boolean;
}): PhraseBankEntry[] {
  const limit = input.limit ?? 8;
  const bandMin = Math.max(3, input.targetDifficulty - 2);
  const bandMax = Math.min(10, input.targetDifficulty + 2);
  const tech = new Set(input.preferredTechniques);
  const theme = input.theme?.toLowerCase();
  const category = input.category?.toLowerCase();

  const scored = PHRASE_BANK.flatMap((entry) => {
    if (input.bannedAnswerKeys.has(normalize(entry.answer))) {
      return [];
    }
    if (input.excludeOverused && entry.overused) {
      return [];
    }
    if (input.requireVisualCuePlan && !entry.visualCues?.length) {
      return [];
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
    return [{ entry, score }];
  }).sort((a, b) => b.score - a.score);

  // Keep the prompt useful for strict answer-first reservation: each
  // technique gets a representative seed before we spend the remaining
  // prompt budget on the highest-scoring nearby answers.
  const selected: PhraseBankEntry[] = [];
  const selectedKeys = new Set<string>();
  for (const technique of input.preferredTechniques) {
    const match = scored.find(
      (candidate) =>
        candidate.entry.techniqueAffinity.includes(technique as TechniqueId) &&
        !selectedKeys.has(normalize(candidate.entry.answer))
    );
    if (!match) continue;
    selected.push(match.entry);
    selectedKeys.add(normalize(match.entry.answer));
    if (selected.length >= limit) break;
  }

  if (selected.length < limit) {
    for (const candidate of scored) {
      const key = normalize(candidate.entry.answer);
      if (selectedKeys.has(key)) continue;
      selected.push(candidate.entry);
      selectedKeys.add(key);
      if (selected.length >= limit) break;
    }
  }

  return selected;
}

export function phraseBankSize(): number {
  return PHRASE_BANK.length;
}
