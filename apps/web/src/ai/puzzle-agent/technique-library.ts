/**
 * Rebus / visual technique library for smarter component assembly.
 */

export type TechniqueId =
  | "simple_compound"
  | "obvious_emoji_sum"
  | "single_homophone"
  | "basic_positional"
  | "multi_emoji_compound"
  | "positional_phrase"
  | "math_symbol_wordplay"
  | "nested_homophone"
  | "false_lead_visual"
  | "idiom_as_picture"
  | "size_or_case_semantics"
  | "multi_layer_phonetic"
  | "spatial_preposition_play"
  | "triple_layer_composition"
  | "rare_but_fair_idiom"
  | "recursive_visual_pun"
  | "cultural_common_knowledge_plus_twist";

export interface TechniqueSpec {
  id: TechniqueId;
  name: string;
  summary: string;
  examplePattern: string;
  howToAssemble: string[];
  funFactor: string;
}

export const TECHNIQUE_LIBRARY: Record<TechniqueId, TechniqueSpec> = {
  simple_compound: {
    id: "simple_compound",
    name: "Simple compound",
    summary: "Two clear visuals that concatenate into a compound word.",
    examplePattern: "☀️ + 🌻 → sunflower",
    howToAssemble: [
      "Pick a familiar compound answer",
      "Map each half to a strong emoji/symbol",
      "Join with + or juxtaposition",
    ],
    funFactor: "Instant aha — great for Hard days.",
  },
  obvious_emoji_sum: {
    id: "obvious_emoji_sum",
    name: "Emoji sum",
    summary: "Emoji read as their noun names and add together.",
    examplePattern: "🐝 + 4️⃣ → before",
    howToAssemble: ["Prefer common emoji names", "Avoid ambiguous glyphs"],
    funFactor: "Playful and shareable.",
  },
  single_homophone: {
    id: "single_homophone",
    name: "Single homophone",
    summary: "One sound-alike swap carries the joke.",
    examplePattern: "👁️ = eye → I",
    howToAssemble: ["Keep other parts literal", "Only one phonetic leap"],
    funFactor: "Clever without cruelty.",
  },
  basic_positional: {
    id: "basic_positional",
    name: "Basic positional",
    summary: "Up/down/over/under placement encodes a preposition.",
    examplePattern: "☁️\n🌧️ → rainfall / cloud over rain",
    howToAssemble: ["Use clear vertical/horizontal layout", "Explain space in the solution"],
    funFactor: "Spatial puzzles feel premium.",
  },
  multi_emoji_compound: {
    id: "multi_emoji_compound",
    name: "Multi-emoji compound",
    summary: "Three+ symbols assemble a phrase.",
    examplePattern: "🌙 + 💡 + 💡 → moonlight (with emphasis)",
    howToAssemble: ["Order must matter", "Drop redundant symbols"],
    funFactor: "Richer visual storytelling.",
  },
  positional_phrase: {
    id: "positional_phrase",
    name: "Positional phrase",
    summary: "Layout encodes an idiom (e.g. reading between the lines).",
    examplePattern: "LINE\nYOU\nLINE → reading between the lines",
    howToAssemble: ["Text + space as meaning", "Keep typography intentional"],
    funFactor: "Classic rebus craft.",
  },
  math_symbol_wordplay: {
    id: "math_symbol_wordplay",
    name: "Math symbol wordplay",
    summary: "÷ × + − or fractions become words (over, under, times).",
    examplePattern: "mind / matter → mind over matter",
    howToAssemble: ["One operator = one word", "Keep operands concrete"],
    funFactor: "Nerdy-satisfying.",
  },
  nested_homophone: {
    id: "nested_homophone",
    name: "Nested homophone",
    summary: "Homophone sits inside a larger compound.",
    examplePattern: "sea + son → season (phonetic chain)",
    howToAssemble: ["Chain at most two sound leaps", "Verify out loud"],
    funFactor: "Rewards saying it aloud.",
  },
  false_lead_visual: {
    id: "false_lead_visual",
    name: "False lead",
    summary: "First reading is wrong; structure reveals the real answer.",
    examplePattern: "Looks like CAT+BOX but means something else via placement",
    howToAssemble: ["Plant a tempting wrong parse", "Make the true parse cleaner once seen"],
    funFactor: "Evil-tier delight.",
  },
  idiom_as_picture: {
    id: "idiom_as_picture",
    name: "Idiom as picture",
    summary: "Familiar idiom rendered literally.",
    examplePattern: "piece of 🍰 → piece of cake",
    howToAssemble: ["Use widely known idioms", "Avoid regional slang"],
    funFactor: "Share-worthy punchline.",
  },
  size_or_case_semantics: {
    id: "size_or_case_semantics",
    name: "Size / case semantics",
    summary: "BIG/small or MiXeD case encodes meaning.",
    examplePattern: "BIG deal → big deal",
    howToAssemble: ["One size cue only", "Pair with a second element"],
    funFactor: "Typography as gameplay.",
  },
  multi_layer_phonetic: {
    id: "multi_layer_phonetic",
    name: "Multi-layer phonetic",
    summary: "Two sound plays stacked carefully.",
    examplePattern: "bee + leaf → belief",
    howToAssemble: ["Test with a friend out loud", "Hints must unlock one layer at a time"],
    funFactor: "Feels like cracking a cipher.",
  },
  spatial_preposition_play: {
    id: "spatial_preposition_play",
    name: "Spatial preposition",
    summary: "in, on, under, around encoded purely by placement.",
    examplePattern: "house\n🔥 → fire under the house / house on fire (pick one clearly)",
    howToAssemble: ["Commit to one preposition reading", "Avoid ambiguous stacks"],
    funFactor: "Elegant when unambiguous.",
  },
  triple_layer_composition: {
    id: "triple_layer_composition",
    name: "Triple-layer composition",
    summary: "Visual + phonetic + positional all contribute.",
    examplePattern: "Complex but fair Impossible-tier board",
    howToAssemble: [
      "Each layer must be necessary",
      "Hints peel layers in order",
      "Answer stays a known phrase",
    ],
    funFactor: "Boss-fight energy.",
  },
  rare_but_fair_idiom: {
    id: "rare_but_fair_idiom",
    name: "Rare-but-fair idiom",
    summary: "Less common idiom still in general vocabulary.",
    examplePattern: "barking up the wrong 🌳",
    howToAssemble: ["Confirm idiom frequency", "Hints name the domain (animals, nature…)"],
    funFactor: "Smart without being obscure.",
  },
  recursive_visual_pun: {
    id: "recursive_visual_pun",
    name: "Recursive visual pun",
    summary: "A symbol comments on another symbol.",
    examplePattern: "🔁 + joke structure that references itself",
    howToAssemble: ["Keep recursion shallow", "Explain cleanly in solution"],
    funFactor: "Meta humor for experts.",
  },
  cultural_common_knowledge_plus_twist: {
    id: "cultural_common_knowledge_plus_twist",
    name: "Common knowledge + twist",
    summary: "Everyday cultural reference with a visual twist.",
    examplePattern: "Familiar story/song title rendered oddly",
    howToAssemble: ["Stick to globally known refs", "No niche fandom required"],
    funFactor: "Memorable daily share.",
  },
};

export function getTechniques(ids: string[]): TechniqueSpec[] {
  return ids
    .map((id) => TECHNIQUE_LIBRARY[id as TechniqueId])
    .filter((t): t is TechniqueSpec => Boolean(t));
}

export function listAllTechniques(): TechniqueSpec[] {
  return Object.values(TECHNIQUE_LIBRARY);
}
