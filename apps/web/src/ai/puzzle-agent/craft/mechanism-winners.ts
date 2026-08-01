/**
 * Mechanism winners — shipped-style examples Eve invents cousins of (never copies).
 */

import type { TechniqueId } from "../technique-library";

export type MechanismWinner = {
  id: string;
  techniqueId: TechniqueId;
  answer: string;
  layerPlan: string;
  whyItWorks: string;
  pictogramNouns: string[];
};

export const MECHANISM_WINNERS: readonly MechanismWinner[] = [
  {
    id: "keyhole-compound",
    techniqueId: "simple_compound",
    answer: "keyhole",
    layerPlan: "key pictogram + hole/circle pictogram in a row",
    whyItWorks: "Two concrete nouns concatenate into a familiar compound",
    pictogramNouns: ["key", "hole"],
  },
  {
    id: "head-over-heels",
    techniqueId: "positional_phrase",
    answer: "head over heels",
    layerPlan: "HEAD text stacked above HEELS text / shoe pictogram",
    whyItWorks: "Layout encodes the preposition; reading order is the joke",
    pictogramNouns: ["heels", "shoe"],
  },
  {
    id: "small-fish-big-pond",
    techniqueId: "size_or_case_semantics",
    answer: "small fish in a big pond",
    layerPlan: "tiny FISH beside large POND / water pictogram",
    whyItWorks: "Scale carries half the meaning",
    pictogramNouns: ["fish", "pond"],
  },
  {
    id: "bee-leaf",
    techniqueId: "single_homophone",
    answer: "belief",
    layerPlan: "bee pictogram + leaf pictogram",
    whyItWorks: "One clear phonetic leap spoken aloud",
    pictogramNouns: ["bee", "leaf"],
  },
  {
    id: "spill-tea",
    techniqueId: "idiom_as_picture",
    answer: "spill the tea",
    layerPlan: "spill/pour pictogram + tea cup pictogram",
    whyItWorks: "Literal scene of a figurative phrase",
    pictogramNouns: ["tea", "cup"],
  },
  {
    id: "reading-between-lines",
    techniqueId: "spatial_preposition_play",
    answer: "reading between the lines",
    layerPlan: "READ text between two LINE strokes / book pictogram",
    whyItWorks: "Between placement is the device",
    pictogramNouns: ["book", "line"],
  },
  {
    id: "false-lead-weather",
    techniqueId: "false_lead_visual",
    answer: "under the weather",
    layerPlan: "tempting cat+box compound until UNDER placement + cloud",
    whyItWorks: "Misdirection then fair twist via placement",
    pictogramNouns: ["cloud", "umbrella"],
  },
  {
    id: "brand-discord-buzz",
    techniqueId: "brand_logo_wordplay",
    answer: "discord",
    layerPlan: "Discord logo + bee pictogram (fresh cousin preferred)",
    whyItWorks: "Household mark + second beat; logo alone is not enough",
    pictogramNouns: ["discord", "bee"],
  },
  {
    id: "triple-once-blue-moon",
    techniqueId: "triple_layer_composition",
    answer: "once in a blue moon",
    layerPlan: "1 + blue paint/text + moon pictogram with IN placement",
    whyItWorks: "Dense but fair when hints name the device family early",
    pictogramNouns: ["moon", "paint"],
  },
  {
    id: "math-countdown",
    techniqueId: "math_symbol_wordplay",
    answer: "countdown",
    layerPlan: "COUNT text − DOWN arrow / descending numbers",
    whyItWorks: "Operator is semantic, not decorative",
    pictogramNouns: ["arrow", "clock"],
  },
  {
    id: "letter-chair-hair",
    techniqueId: "letter_play",
    answer: "hair",
    layerPlan: "CHAIR text with C struck out / minus C",
    whyItWorks: "One clear letter deletion with a common leftover word",
    pictogramNouns: ["chair", "comb"],
  },
  {
    id: "container-cat-bag",
    techniqueId: "container_phrase",
    answer: "cat in the bag",
    layerPlan: "cat pictogram visually inside bag pictogram",
    whyItWorks: "Containment encodes the preposition; multi-word uniqueness",
    pictogramNouns: ["cat", "bag"],
  },
  {
    id: "direction-wrong-way",
    techniqueId: "direction_wordplay",
    answer: "wrong way",
    layerPlan: "one-way arrow operator reversed / crossed",
    whyItWorks: "Direction glyph is the joke, not decoration",
    pictogramNouns: ["arrow", "sign"],
  },
  {
    id: "hyphen-eye-opening",
    techniqueId: "hyphen_compound",
    answer: "eye-opening",
    layerPlan: "eye pictogram + OPENING / door pictogram",
    whyItWorks: "Hyphenated everyday compound expands beyond closed compounds",
    pictogramNouns: ["eye", "door"],
  },
] as const;

export function sampleMechanismWinners(input: {
  preferredTechniques?: string[];
  limit?: number;
}): MechanismWinner[] {
  const limit = Math.max(1, Math.min(8, input.limit ?? 4));
  const preferred = new Set(input.preferredTechniques ?? []);
  const scored = MECHANISM_WINNERS.map((w) => ({
    w,
    score: preferred.has(w.techniqueId) ? 3 : 1,
  }));
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.w);
}

export function mechanismWinnersBrief(winners: MechanismWinner[]): string {
  if (!winners.length) return "";
  return [
    "Mechanism winners (invent a cousin — do not copy answers/boards):",
    ...winners.map(
      (w) =>
        `  - ${w.techniqueId}: ${w.layerPlan} → "${w.answer}" (${w.whyItWorks})`
    ),
  ].join("\n");
}
