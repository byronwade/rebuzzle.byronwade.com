import {
  buildPuzzleNoveltySignature,
  createPuzzleNoveltyModule,
  type PuzzleNoveltyArchiveEntry,
  type PuzzleNoveltyEvidence,
} from "./novelty";
import { normalizeAnswerKey } from "./quality";
import type { TechniqueId } from "./technique-library";
import {
  buildUnicodeFallback,
  type PuzzleVisual,
  PuzzleVisualSchema,
  type VisualLayer,
} from "./visual/composition";
import { resolveCuratedPictogram } from "./visual/curated-pictograms";
import { INK_PICTOGRAM_STYLE_ID } from "./visual/style";

export const RESERVE_PUZZLE_CORPUS_VERSION = "catalog-reserve-v1";

export type ReservePuzzle = {
  id: string;
  rebusPuzzle: string;
  answer: string;
  difficulty: number;
  difficultyLevel: "Hard" | "Difficult";
  explanation: string;
  category: "compound_words" | "phrases_and_idioms" | "wordplay";
  hints: [string, string, string];
  techniqueId: TechniqueId;
  visual: PuzzleVisual;
};

export type SelectedReservePuzzle = {
  puzzle: ReservePuzzle;
  noveltyEvidence: PuzzleNoveltyEvidence;
  corpusVersion: typeof RESERVE_PUZZLE_CORPUS_VERSION;
};

type ReserveDefinition = {
  id: string;
  answer: string;
  parts: string;
  layers: VisualLayer[];
  category?: ReservePuzzle["category"];
  techniqueId?: TechniqueId;
  layout?: PuzzleVisual["layout"];
  difficulty?: number;
};

function pictogram(concept: string, emojiFallback: string): VisualLayer {
  const asset = resolveCuratedPictogram(concept);
  if (!asset) throw new Error(`Reserve puzzle references missing pictogram: ${concept}`);
  return {
    kind: "pictogram",
    concept: asset.canonicalConcept,
    emojiFallback,
    svg: asset.svg,
    assetId: asset.assetId,
    source: "catalog",
  };
}

function text(
  content: string,
  emphasis: Extract<VisualLayer, { kind: "text" }>["emphasis"] = "normal"
): VisualLayer {
  return { kind: "text", content, emphasis };
}

function plus(): VisualLayer {
  return { kind: "operator", symbol: "+" };
}

function operator(symbol: string): VisualLayer {
  return { kind: "operator", symbol };
}

function define(input: ReserveDefinition): ReservePuzzle {
  const techniqueId = input.techniqueId ?? "simple_compound";
  const layout = input.layout ?? "row";
  const visual: PuzzleVisual = {
    styleId: INK_PICTOGRAM_STYLE_ID,
    mode: "composed",
    layout,
    layers: input.layers,
    unicodeFallback: buildUnicodeFallback(input.layers),
  };
  const isPositional = layout !== "row";
  return {
    id: input.id,
    rebusPuzzle: visual.unicodeFallback,
    answer: input.answer,
    difficulty: input.difficulty ?? (isPositional ? 5 : 4),
    difficultyLevel: isPositional ? "Difficult" : "Hard",
    explanation: `${input.parts} gives “${input.answer}.”`,
    category: input.category ?? "compound_words",
    hints: isPositional
      ? [
          "The placement of the clues matters.",
          "Read the board by position, not as a sentence.",
          "Turn the spatial relationship into a familiar phrase.",
        ]
      : [
          "Read each clue from left to right.",
          "Name each picture or printed word plainly.",
          "Join the parts into one familiar word or phrase.",
        ],
    techniqueId,
    visual,
  };
}

/**
 * Offline reserve inventory. Every pictogram is resolved from the same reviewed local catalog
 * as generated puzzles; no generated SVG or model call is allowed in the degraded path.
 */
export const RESERVE_PUZZLES: readonly ReservePuzzle[] = [
  define({
    id: "reserve:firetruck",
    answer: "firetruck",
    parts: "Fire plus truck",
    layers: [pictogram("fire", "🔥"), plus(), pictogram("truck", "🚚")],
  }),
  define({
    id: "reserve:birdhouse",
    answer: "birdhouse",
    parts: "Bird plus house",
    layers: [pictogram("bird", "🐦"), plus(), pictogram("house", "🏠")],
    techniqueId: "obvious_emoji_sum",
  }),
  define({
    id: "reserve:doghouse",
    answer: "doghouse",
    parts: "Dog plus house",
    layers: [pictogram("dog", "🐕"), plus(), pictogram("house", "🏠")],
  }),
  define({
    id: "reserve:catfish",
    answer: "catfish",
    parts: "Cat plus fish",
    layers: [pictogram("cat", "🐈"), plus(), pictogram("fish", "🐟")],
    techniqueId: "obvious_emoji_sum",
  }),
  define({
    id: "reserve:mailbox",
    answer: "mailbox",
    parts: "Mail plus box",
    layers: [pictogram("envelope", "✉️"), plus(), text("BOX")],
  }),
  define({
    id: "reserve:doorbell",
    answer: "doorbell",
    parts: "Door plus bell",
    layers: [pictogram("door", "🚪"), plus(), pictogram("bell", "🔔")],
    techniqueId: "obvious_emoji_sum",
  }),
  define({
    id: "reserve:handbag",
    answer: "handbag",
    parts: "Hand plus bag",
    layers: [pictogram("hand", "✋"), plus(), text("BAG")],
  }),
  define({
    id: "reserve:bedtime",
    answer: "bedtime",
    parts: "Bed plus time",
    layers: [pictogram("bed", "🛏️"), plus(), pictogram("clock", "🕐")],
    techniqueId: "obvious_emoji_sum",
  }),
  define({
    id: "reserve:moonwalk",
    answer: "moonwalk",
    parts: "Moon plus footsteps",
    layers: [pictogram("moon", "🌙"), plus(), pictogram("footprints", "👣")],
  }),
  define({
    id: "reserve:hotdog",
    answer: "hotdog",
    parts: "Hot fire plus dog",
    layers: [pictogram("fire", "🔥"), plus(), pictogram("dog", "🐕")],
    category: "wordplay",
    techniqueId: "idiom_as_picture",
  }),
  define({
    id: "reserve:watchdog",
    answer: "watchdog",
    parts: "Watch plus dog",
    layers: [pictogram("watch", "⌚"), plus(), pictogram("dog", "🐕")],
    techniqueId: "obvious_emoji_sum",
  }),
  define({
    id: "reserve:lighthouse",
    answer: "lighthouse",
    parts: "Light plus house",
    layers: [pictogram("lightbulb", "💡"), plus(), pictogram("house", "🏠")],
  }),
  define({
    id: "reserve:starlight",
    answer: "starlight",
    parts: "Star plus light",
    layers: [pictogram("star", "⭐"), plus(), pictogram("lightbulb", "💡")],
    techniqueId: "obvious_emoji_sum",
  }),
  define({
    id: "reserve:cookbook",
    answer: "cookbook",
    parts: "Cooking plus book",
    layers: [text("COOK"), plus(), pictogram("book", "📖")],
  }),
  define({
    id: "reserve:rainforest",
    answer: "rainforest",
    parts: "Rain plus forest tree",
    layers: [pictogram("rain", "🌧️"), plus(), pictogram("tree", "🌳")],
    techniqueId: "obvious_emoji_sum",
  }),
  define({
    id: "reserve:campfire",
    answer: "campfire",
    parts: "Camp tent plus fire",
    layers: [text("CAMP"), plus(), pictogram("fire", "🔥")],
  }),
  define({
    id: "reserve:airmail",
    answer: "airmail",
    parts: "Airplane plus mail",
    layers: [pictogram("plane", "✈️"), plus(), pictogram("envelope", "✉️")],
    techniqueId: "obvious_emoji_sum",
  }),
  define({
    id: "reserve:phonebook",
    answer: "phonebook",
    parts: "Phone plus book",
    layers: [pictogram("phone", "📱"), plus(), pictogram("book", "📖")],
  }),
  define({
    id: "reserve:songbird",
    answer: "songbird",
    parts: "Music plus bird",
    layers: [pictogram("music", "🎵"), plus(), pictogram("bird", "🐦")],
    techniqueId: "obvious_emoji_sum",
  }),
  define({
    id: "reserve:toolbox",
    answer: "toolbox",
    parts: "Tool plus box",
    layers: [pictogram("wrench", "🔧"), plus(), text("BOX")],
  }),
  define({
    id: "reserve:birdbrain",
    answer: "birdbrain",
    parts: "Bird plus brain",
    layers: [pictogram("bird", "🐦"), plus(), pictogram("brain", "🧠")],
    category: "wordplay",
    techniqueId: "idiom_as_picture",
  }),
  define({
    id: "reserve:brainchild",
    answer: "brainchild",
    parts: "Brain plus child",
    layers: [pictogram("brain", "🧠"), plus(), pictogram("baby", "👶")],
    category: "wordplay",
    techniqueId: "idiom_as_picture",
  }),
  define({
    id: "reserve:sweetheart",
    answer: "sweetheart",
    parts: "Sweet candy plus heart",
    layers: [pictogram("candy", "🍬"), plus(), pictogram("heart", "❤️")],
  }),
  define({
    id: "reserve:heartburn",
    answer: "heartburn",
    parts: "Heart plus fire",
    layers: [pictogram("heart", "❤️"), plus(), pictogram("fire", "🔥")],
    techniqueId: "obvious_emoji_sum",
  }),
  define({
    id: "reserve:pizza-box",
    answer: "pizza box",
    parts: "Pizza plus box",
    layers: [pictogram("pizza", "🍕"), plus(), text("BOX")],
  }),
  define({
    id: "reserve:eggplant",
    answer: "eggplant",
    parts: "Egg plus plant",
    layers: [pictogram("egg", "🥚"), plus(), pictogram("sprout", "🌱")],
    techniqueId: "obvious_emoji_sum",
  }),
  define({
    id: "reserve:treehouse",
    answer: "treehouse",
    parts: "Tree plus house",
    layers: [pictogram("tree", "🌳"), plus(), pictogram("house", "🏠")],
  }),
  define({
    id: "reserve:snowball",
    answer: "snowball",
    parts: "Snow plus ball",
    layers: [pictogram("snowflake", "❄️"), plus(), text("BALL")],
  }),
  define({
    id: "reserve:eyeball",
    answer: "eyeball",
    parts: "Eye plus ball",
    layers: [pictogram("eye", "👁️"), plus(), text("BALL")],
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:fireball",
    answer: "fireball",
    parts: "Fire plus ball",
    layers: [pictogram("fire", "🔥"), plus(), text("BALL")],
  }),
  define({
    id: "reserve:clockwork",
    answer: "clockwork",
    parts: "Clock plus work",
    layers: [pictogram("clock", "🕐"), plus(), text("WORK")],
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:blackmail",
    answer: "blackmail",
    parts: "Black plus mail",
    layers: [text("BLACK"), plus(), pictogram("envelope", "✉️")],
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:bluebird",
    answer: "bluebird",
    parts: "Blue plus bird",
    layers: [text("BLUE"), plus(), pictogram("bird", "🐦")],
  }),
  define({
    id: "reserve:newsflash",
    answer: "newsflash",
    parts: "News plus a flash",
    layers: [pictogram("newspaper", "📰"), plus(), pictogram("lightning", "⚡")],
    category: "wordplay",
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:dead-end",
    answer: "dead end",
    parts: "Dead plus end",
    layers: [pictogram("skull", "💀"), plus(), text("END")],
    category: "phrases_and_idioms",
    techniqueId: "idiom_as_picture",
  }),
  define({
    id: "reserve:deadline",
    answer: "deadline",
    parts: "Dead plus line",
    layers: [pictogram("skull", "💀"), plus(), text("LINE")],
    category: "wordplay",
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:cold-feet",
    answer: "cold feet",
    parts: "Cold snow plus feet",
    layers: [pictogram("snowflake", "❄️"), plus(), pictogram("footprints", "👣")],
    category: "phrases_and_idioms",
    techniqueId: "idiom_as_picture",
  }),
  define({
    id: "reserve:baby-shower",
    answer: "baby shower",
    parts: "Baby plus a rain shower",
    layers: [pictogram("baby", "👶"), plus(), pictogram("rain", "🌧️")],
    category: "phrases_and_idioms",
    techniqueId: "idiom_as_picture",
  }),
  define({
    id: "reserve:brain-drain",
    answer: "brain drain",
    parts: "Brain plus draining water",
    layers: [pictogram("brain", "🧠"), plus(), text("DRAIN")],
    category: "phrases_and_idioms",
    techniqueId: "idiom_as_picture",
  }),
  define({
    id: "reserve:love-letter",
    answer: "love letter",
    parts: "Love heart plus letter",
    layers: [pictogram("heart", "❤️"), plus(), pictogram("envelope", "✉️")],
    category: "phrases_and_idioms",
    techniqueId: "idiom_as_picture",
  }),
  define({
    id: "reserve:junk-mail",
    answer: "junk mail",
    parts: "Trash plus mail",
    layers: [pictogram("trash", "🗑️"), plus(), pictogram("envelope", "✉️")],
    category: "phrases_and_idioms",
    techniqueId: "idiom_as_picture",
  }),
  define({
    id: "reserve:rain-check",
    answer: "rain check",
    parts: "Rain plus a check mark",
    layers: [pictogram("rain", "🌧️"), plus(), operator("✓")],
    category: "phrases_and_idioms",
    techniqueId: "math_symbol_wordplay",
  }),
  define({
    id: "reserve:hot-shot",
    answer: "hot shot",
    parts: "Hot fire plus a camera shot",
    layers: [pictogram("fire", "🔥"), plus(), pictogram("camera", "📷")],
    category: "phrases_and_idioms",
    techniqueId: "idiom_as_picture",
  }),
  define({
    id: "reserve:piece-of-cake",
    answer: "piece of cake",
    parts: "Puzzle piece plus cake",
    layers: [pictogram("puzzle", "🧩"), plus(), text("CAKE")],
    category: "phrases_and_idioms",
    techniqueId: "rare_but_fair_idiom",
  }),
  define({
    id: "reserve:handbook",
    answer: "handbook",
    parts: "Hand plus book",
    layers: [pictogram("hand", "✋"), plus(), text("BOOK")],
  }),
  define({
    id: "reserve:bookend",
    answer: "bookend",
    parts: "Book plus end",
    layers: [pictogram("book", "📖"), plus(), text("END")],
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:housework",
    answer: "housework",
    parts: "House plus work",
    layers: [pictogram("house", "🏠"), plus(), text("WORK")],
  }),
  define({
    id: "reserve:daydream",
    answer: "daydream",
    parts: "Daytime sun plus dream",
    layers: [pictogram("sun", "☀️"), plus(), text("DREAM")],
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:keychain",
    answer: "keychain",
    parts: "Key plus chain",
    layers: [pictogram("key", "🔑"), plus(), text("CHAIN")],
  }),
  define({
    id: "reserve:keyring",
    answer: "keyring",
    parts: "Key plus ring",
    layers: [pictogram("key", "🔑"), plus(), text("RING")],
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:gemstone",
    answer: "gemstone",
    parts: "Gem plus stone",
    layers: [pictogram("diamond", "💎"), plus(), text("STONE")],
  }),
  define({
    id: "reserve:doorway",
    answer: "doorway",
    parts: "Door plus way",
    layers: [pictogram("door", "🚪"), plus(), text("WAY")],
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:rainfall",
    answer: "rainfall",
    parts: "Rain plus fall",
    layers: [pictogram("rain", "🌧️"), plus(), text("FALL")],
  }),
  define({
    id: "reserve:moonbeam",
    answer: "moonbeam",
    parts: "Moon plus beam",
    layers: [pictogram("moon", "🌙"), plus(), text("BEAM")],
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:notebook",
    answer: "notebook",
    parts: "Note plus book",
    layers: [text("NOTE"), plus(), pictogram("book", "📖")],
  }),
  define({
    id: "reserve:textbook",
    answer: "textbook",
    parts: "Text plus book",
    layers: [text("TEXT"), plus(), pictogram("book", "📖")],
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:storybook",
    answer: "storybook",
    parts: "Story plus book",
    layers: [text("STORY"), plus(), pictogram("book", "📖")],
  }),
  define({
    id: "reserve:dreamboat",
    answer: "dreamboat",
    parts: "Dream plus boat",
    layers: [text("DREAM"), plus(), pictogram("boat", "⛵")],
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:backdoor",
    answer: "backdoor",
    parts: "Back plus door",
    layers: [text("BACK"), plus(), pictogram("door", "🚪")],
  }),
  define({
    id: "reserve:blue-moon",
    answer: "blue moon",
    parts: "Blue plus moon",
    layers: [text("BLUE"), plus(), pictogram("moon", "🌙")],
    category: "phrases_and_idioms",
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:black-cat",
    answer: "black cat",
    parts: "Black plus cat",
    layers: [text("BLACK"), plus(), pictogram("cat", "🐈")],
    techniqueId: "multi_layer_phonetic",
  }),
  define({
    id: "reserve:red-eye",
    answer: "red eye",
    parts: "Red plus eye",
    layers: [text("RED"), plus(), pictogram("eye", "👁️")],
    category: "phrases_and_idioms",
  }),
  define({
    id: "reserve:big-fish",
    answer: "big fish",
    parts: "A visually big FISH",
    layers: [text("FISH", "large")],
    category: "phrases_and_idioms",
    techniqueId: "size_or_case_semantics",
  }),
  define({
    id: "reserve:small-world",
    answer: "small world",
    parts: "A visually small WORLD",
    layers: [text("WORLD", "small")],
    category: "phrases_and_idioms",
    techniqueId: "size_or_case_semantics",
  }),
  define({
    id: "reserve:little-things",
    answer: "little things",
    parts: "A visually little THINGS",
    layers: [text("THINGS", "tiny")],
    category: "phrases_and_idioms",
    techniqueId: "size_or_case_semantics",
  }),
  define({
    id: "reserve:tricycle",
    answer: "tricycle",
    parts: "Three copies of CYCLE",
    layers: [text("CYCLE"), text("CYCLE"), text("CYCLE")],
    category: "wordplay",
    techniqueId: "multi_layer_phonetic",
    difficulty: 5,
  }),
  define({
    id: "reserve:i-understand",
    answer: "I understand",
    parts: "I placed under STAND",
    layers: [text("STAND"), text("I")],
    category: "phrases_and_idioms",
    techniqueId: "spatial_preposition_play",
    layout: "stack",
    difficulty: 5,
  }),
  define({
    id: "reserve:life-after-death",
    answer: "life after death",
    parts: "LIFE placed after a symbol of death",
    layers: [pictogram("skull", "💀"), text("LIFE")],
    category: "phrases_and_idioms",
    techniqueId: "spatial_preposition_play",
    difficulty: 5,
  }),
  define({
    id: "reserve:world-under-water",
    answer: "world under water",
    parts: "The world placed under water",
    layers: [text("WATER"), pictogram("globe", "🌍")],
    category: "phrases_and_idioms",
    techniqueId: "spatial_preposition_play",
    layout: "stack",
    difficulty: 5,
  }),
];

export function validateReservePuzzleCorpus(
  corpus: readonly ReservePuzzle[] = RESERVE_PUZZLES
): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  const answers = new Set<string>();
  const compositions = new Set<string>();
  if (corpus.length < 60) issues.push(`Reserve corpus has only ${corpus.length} puzzles; need 60+`);

  for (const puzzle of corpus) {
    if (ids.has(puzzle.id)) issues.push(`Duplicate reserve id: ${puzzle.id}`);
    ids.add(puzzle.id);
    const answerKey = normalizeAnswerKey(puzzle.answer);
    if (answers.has(answerKey)) issues.push(`Duplicate reserve answer: ${puzzle.answer}`);
    answers.add(answerKey);
    const parsed = PuzzleVisualSchema.safeParse(puzzle.visual);
    if (!parsed.success) issues.push(`Invalid visual for ${puzzle.id}: ${parsed.error.message}`);
    if (puzzle.rebusPuzzle !== puzzle.visual.unicodeFallback) {
      issues.push(`Unicode fallback drift for ${puzzle.id}`);
    }
    if (normalizeAnswerKey(puzzle.rebusPuzzle) === answerKey) {
      issues.push(`Reserve board exposes its answer: ${puzzle.id}`);
    }
    if (puzzle.hints.length !== 3 || puzzle.hints.some((hint) => !hint.trim())) {
      issues.push(`Reserve hints are incomplete: ${puzzle.id}`);
    }
    for (const layer of puzzle.visual.layers) {
      if (layer.kind === "image") issues.push(`Reserve puzzle uses an image layer: ${puzzle.id}`);
      if (
        layer.kind === "pictogram" &&
        (layer.source !== "catalog" || !layer.assetId || !layer.svg)
      ) {
        issues.push(`Reserve pictogram is not catalog-grounded: ${puzzle.id}/${layer.concept}`);
      }
    }
    const signature = buildPuzzleNoveltySignature(puzzle);
    const composition = `${signature.mechanismKey}:${signature.orderedCueKey}`;
    if (compositions.has(composition)) {
      issues.push(`Duplicate reserve structural composition: ${puzzle.id}`);
    }
    compositions.add(composition);
  }
  return issues;
}

function stableDateSeed(dateString: string): number {
  let hash = 2166136261;
  for (const character of dateString) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class ReservePuzzleExhaustedError extends Error {
  constructor(
    message: string,
    readonly rejections: readonly string[]
  ) {
    super(message);
    this.name = "ReservePuzzleExhaustedError";
  }
}

export async function selectReservePuzzle(input: {
  dateString: string;
  usedAnswerKeys: ReadonlySet<string>;
  recentPuzzles: readonly PuzzleNoveltyArchiveEntry[];
  now?: () => Date;
  corpus?: readonly ReservePuzzle[];
}): Promise<SelectedReservePuzzle> {
  const corpus = input.corpus ?? RESERVE_PUZZLES;
  const corpusErrors = validateReservePuzzleCorpus(corpus);
  if (corpusErrors.length) {
    throw new ReservePuzzleExhaustedError("Reserve corpus failed validation", corpusErrors);
  }
  const available = corpus.filter(
    (puzzle) => !input.usedAnswerKeys.has(normalizeAnswerKey(puzzle.answer))
  );
  if (!available.length) {
    throw new ReservePuzzleExhaustedError("No unused reserve puzzle answers remain", []);
  }
  const offset = stableDateSeed(input.dateString) % available.length;
  const ordered = [...available.slice(offset), ...available.slice(0, offset)];
  const archive = {
    async findExactAnswer(answerKey: string) {
      if (!input.usedAnswerKeys.has(answerKey)) return null;
      return {
        id: `archive:${answerKey}`,
        answer: answerKey,
        category: "archive",
        createdAt: new Date(0),
      };
    },
    async listRecent(since: Date, limit: number) {
      return input.recentPuzzles
        .filter((entry) => entry.createdAt >= since)
        .slice(0, limit) as PuzzleNoveltyArchiveEntry[];
    },
  };
  const novelty = createPuzzleNoveltyModule({ archive, now: input.now });
  const rejections: string[] = [];
  for (const puzzle of ordered) {
    const assessment = await novelty.evaluate(puzzle);
    if (assessment.isUnique) {
      return {
        puzzle,
        noveltyEvidence: assessment.evidence,
        corpusVersion: RESERVE_PUZZLE_CORPUS_VERSION,
      };
    }
    rejections.push(`${puzzle.id}: ${assessment.blockers.join("; ")}`);
  }
  throw new ReservePuzzleExhaustedError(
    `Unused reserve puzzles remain, but all violate current novelty policy. First conflicts: ${rejections.slice(0, 3).join(" | ")}`,
    rejections
  );
}
