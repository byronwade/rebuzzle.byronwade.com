/**
 * Canonical difficulty levels for generation + UI.
 * Ranges are non-overlapping so the agent and players share one vocabulary.
 */

export type DifficultyTier = "hard" | "difficult" | "evil" | "impossible";

export type DifficultyTierLabel = "Hard" | "Difficult" | "Evil" | "Impossible";

export interface DifficultyLevelSpec {
  tier: DifficultyTier;
  label: DifficultyTierLabel;
  /** Inclusive numeric band on the 1–10 scale */
  min: number;
  max: number;
  /** Typical daily target inside the band */
  target: number;
  blurb: string;
  playerPromise: string;
  /** How many visual/semantic layers the puzzle should use */
  componentBudget: { min: number; max: number };
  /** Hint ladder style for this tier */
  hintStyle: string;
  /** Techniques that fit this tier (rebus-first; other types adapt) */
  techniques: string[];
  /** Anti-patterns that make a puzzle too easy/unfair for this tier */
  avoid: string[];
}

export const DIFFICULTY_LEVELS: readonly DifficultyLevelSpec[] = [
  {
    tier: "hard",
    label: "Hard",
    min: 4,
    max: 5,
    target: 5,
    blurb: "Clever but fair — most players should crack it with focused thinking.",
    playerPromise: "One clear visual idea, maybe a light phonetic twist.",
    componentBudget: { min: 2, max: 4 },
    hintStyle: "Broad category → structural clue → almost-gives-it-away",
    techniques: ["simple_compound", "obvious_emoji_sum", "single_homophone", "basic_positional"],
    avoid: ["obscure slang", "more than one layer of wordplay", "tiny unreadable symbols"],
  },
  {
    tier: "difficult",
    label: "Difficult",
    min: 6,
    max: 6,
    target: 6,
    blurb: "Needs a second look — multiple elements that lock together.",
    playerPromise: "Two interacting ideas; answer is a common phrase or compound.",
    componentBudget: { min: 3, max: 5 },
    hintStyle: "Theme → relationship between parts → key word fragment",
    techniques: [
      "multi_emoji_compound",
      "positional_phrase",
      "math_symbol_wordplay",
      "nested_homophone",
    ],
    avoid: ["pure trivia without visual cue", "answers that are proper nouns nobody knows"],
  },
  {
    tier: "evil",
    label: "Evil",
    min: 7,
    max: 7,
    target: 7,
    blurb: "Lateral thinking required — the obvious reading is a trap.",
    playerPromise: "Misdirection + a satisfying aha once the structure clicks.",
    componentBudget: { min: 4, max: 6 },
    hintStyle: "What NOT to do → abstract structure → concrete fragment",
    techniques: [
      "false_lead_visual",
      "idiom_as_picture",
      "size_or_case_semantics",
      "multi_layer_phonetic",
      "spatial_preposition_play",
    ],
    avoid: ["arbitrary emoji salad", "answers longer than 4 words unless idiomatic"],
  },
  {
    tier: "impossible",
    label: "Impossible",
    min: 8,
    max: 9,
    target: 8,
    blurb: "Expert mode — dense composition, still solvable with the hint ladder.",
    playerPromise: "Dense wordplay; hints must make it fair.",
    componentBudget: { min: 5, max: 8 },
    hintStyle: "Genre → mechanism → nearly complete scaffold",
    techniques: [
      "triple_layer_composition",
      "rare_but_fair_idiom",
      "recursive_visual_pun",
      "cultural_common_knowledge_plus_twist",
    ],
    avoid: ["unsolvable without niche jargon", "hiding letters with no visual logic"],
  },
] as const;

export function getDifficultyLevelForScore(score: number): DifficultyLevelSpec {
  const clamped = Math.max(1, Math.min(10, Math.round(score)));
  for (const level of DIFFICULTY_LEVELS) {
    if (clamped >= level.min && clamped <= level.max) return level;
  }
  if (clamped < DIFFICULTY_LEVELS[0]!.min) return DIFFICULTY_LEVELS[0]!;
  return DIFFICULTY_LEVELS[DIFFICULTY_LEVELS.length - 1]!;
}

export function getDifficultyLevelByTier(tier: DifficultyTier): DifficultyLevelSpec {
  const found = DIFFICULTY_LEVELS.find((l) => l.tier === tier);
  if (!found) throw new Error(`Unknown difficulty tier: ${tier}`);
  return found;
}

/** Snap a score into the nearest tier target when outside bands. */
export function snapToDifficultyBand(score: number): number {
  const level = getDifficultyLevelForScore(score);
  if (score >= level.min && score <= level.max) {
    return Math.max(level.min, Math.min(level.max, Math.round(score)));
  }
  return level.target;
}

export function isDifficultyInBand(score: number, target: number): boolean {
  const targetLevel = getDifficultyLevelForScore(target);
  return score >= targetLevel.min && score <= targetLevel.max;
}
