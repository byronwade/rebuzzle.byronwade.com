/**
 * Rebus / visual technique library for smarter component assembly.
 * Examples use concrete Ink Pictogram nouns — not overused emoji clichés.
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
    examplePattern: "🔑 + 🕳 → keyhole (key pictogram + hole/circle)",
    howToAssemble: [
      "Pick a familiar compound with drawable halves",
      "Map each half to a concrete Ink Pictogram noun (not an abstract word)",
      "Join with + or juxtaposition",
    ],
    funFactor: "Instant aha — great for Hard days.",
  },
  obvious_emoji_sum: {
    id: "obvious_emoji_sum",
    name: "Icon sum",
    summary: "Icons read as their noun names and add together.",
    examplePattern: "⚓ + 🧑 → anchorman (anchor + man)",
    howToAssemble: [
      "Use common concrete nouns a stranger can sketch",
      "Avoid ambiguous or abstract glyphs",
      "Prefer custom pictograms over stock emoji",
    ],
    funFactor: "Playful and shareable.",
  },
  single_homophone: {
    id: "single_homophone",
    name: "Single homophone",
    summary: "One sound-alike swap carries the joke.",
    examplePattern: "🍐 + 🚪 → pair/pear of doors → paradise (careful: keep one leap)",
    howToAssemble: [
      "Keep other parts literal",
      "Only one phonetic leap",
      "Say the board out loud to verify",
    ],
    funFactor: "Clever without cruelty.",
  },
  basic_positional: {
    id: "basic_positional",
    name: "Basic positional",
    summary: "Up/down/over/under placement encodes a preposition.",
    examplePattern: "🌉\n💧 → waterfall (water under bridge / falls)",
    howToAssemble: [
      "Use clear vertical/horizontal layout",
      "Concrete pictograms only",
      "Explain space in the solution",
    ],
    funFactor: "Spatial puzzles feel premium.",
  },
  multi_emoji_compound: {
    id: "multi_emoji_compound",
    name: "Multi-icon compound",
    summary: "Three+ symbols assemble a phrase.",
    examplePattern: "🌙 + 💡 → moonlight",
    howToAssemble: [
      "Order must matter",
      "Drop redundant symbols",
      "Each icon must be instantly recognizable",
    ],
    funFactor: "Richer visual storytelling.",
  },
  positional_phrase: {
    id: "positional_phrase",
    name: "Positional phrase",
    summary: "Layout encodes an idiom via placement (not a letter dump).",
    examplePattern: "HEAD\n☁️☁️ → head in the clouds",
    howToAssemble: [
      "Text + space as meaning",
      "Keep typography intentional",
      "Prefer fresh idioms over overused classics",
    ],
    funFactor: "Classic rebus craft, modernized.",
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
    examplePattern: "🌊 + ☀ → season (sea + sun)",
    howToAssemble: [
      "Chain at most two sound leaps",
      "Verify out loud",
      "Use drawable nouns for each sound",
    ],
    funFactor: "Rewards saying it aloud.",
  },
  false_lead_visual: {
    id: "false_lead_visual",
    name: "False lead",
    summary: "First reading is wrong; structure reveals the real answer.",
    examplePattern: "Looks like CAT+BOX but means something else via placement",
    howToAssemble: [
      "Plant a tempting wrong parse",
      "Make the true parse cleaner once seen",
      "Icons must still be readable individually",
    ],
    funFactor: "Evil-tier delight.",
  },
  idiom_as_picture: {
    id: "idiom_as_picture",
    name: "Idiom as picture",
    summary: "Familiar idiom rendered literally with concrete icons.",
    examplePattern: "spill the ☕ → spill the tea / beans (pick a fresh idiom)",
    howToAssemble: [
      "Use widely known idioms",
      "Avoid regional slang and overused tropes (piece of cake)",
      "Punch image = one clear pictogram noun",
    ],
    funFactor: "Share-worthy punchline.",
  },
  size_or_case_semantics: {
    id: "size_or_case_semantics",
    name: "Size / case semantics",
    summary: "BIG/small or MiXeD case encodes meaning.",
    examplePattern: "tiny FISH in a big pond → small fish in a big pond",
    howToAssemble: [
      "One size cue only",
      "Pair with a supporting pictogram",
      "Don't rely on emoji padding",
    ],
    funFactor: "Typography as gameplay.",
  },
  multi_layer_phonetic: {
    id: "multi_layer_phonetic",
    name: "Multi-layer phonetic",
    summary: "Two sound plays stacked carefully.",
    examplePattern: "🔔 + ⚓ → buoyant? Prefer clearer chains like flour + ish → flourish",
    howToAssemble: [
      "Test with a friend out loud",
      "Hints must unlock one layer at a time",
      "Concrete pictogram for each sound cue",
    ],
    funFactor: "Feels like cracking a cipher.",
  },
  spatial_preposition_play: {
    id: "spatial_preposition_play",
    name: "Spatial preposition",
    summary: "in, on, under, around encoded purely by placement.",
    examplePattern: "🏠\n🔥 → house on fire (commit to one clear reading)",
    howToAssemble: [
      "Commit to one preposition reading",
      "Avoid ambiguous stacks",
      "Drawable house/fire-style nouns",
    ],
    funFactor: "Elegant when unambiguous.",
  },
  triple_layer_composition: {
    id: "triple_layer_composition",
    name: "Triple-layer composition",
    summary: "Visual + phonetic + positional all contribute.",
    examplePattern: "Complex but fair Impossible-tier board with 3 necessary layers",
    howToAssemble: [
      "Each layer must be necessary",
      "Hints peel layers in order",
      "Answer stays a known phrase; icons stay concrete",
    ],
    funFactor: "Boss-fight energy.",
  },
  rare_but_fair_idiom: {
    id: "rare_but_fair_idiom",
    name: "Rare-but-fair idiom",
    summary: "Less common idiom still in general vocabulary.",
    examplePattern: "barking up the wrong 🌳",
    howToAssemble: [
      "Confirm idiom frequency",
      "Hints name the domain (animals, nature…)",
      "Tree/animal pictograms must be unmistakable",
    ],
    funFactor: "Smart without being obscure.",
  },
  recursive_visual_pun: {
    id: "recursive_visual_pun",
    name: "Recursive visual pun",
    summary: "A symbol comments on another symbol.",
    examplePattern: "mirror pictogram reflecting another icon → reflection pun",
    howToAssemble: [
      "Keep recursion shallow",
      "Explain cleanly in solution",
      "Both icons must be readable alone",
    ],
    funFactor: "Meta humor for experts.",
  },
  cultural_common_knowledge_plus_twist: {
    id: "cultural_common_knowledge_plus_twist",
    name: "Common knowledge + twist",
    summary: "Everyday cultural reference with a visual twist.",
    examplePattern: "Familiar story/song title rendered oddly with concrete icons",
    howToAssemble: [
      "Stick to globally known refs",
      "No niche fandom required",
      "Twist should still feel fair with hints",
    ],
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
