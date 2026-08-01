/**
 * Deterministic daily seeds — keep the board live when Eve/cron fails.
 * Fair Hard/Difficult rebus only; cron may upgrade seeds before anyone plays.
 */

export type FallbackPuzzle = {
  rebusPuzzle: string;
  answer: string;
  difficulty: number;
  explanation: string;
  category: string;
  hints: string[];
};

/** Rotating pool — answers reused only for emergency seeds (allowDuplicateAnswer). */
export const FALLBACK_PUZZLES: readonly FallbackPuzzle[] = [
  {
    rebusPuzzle: "☀️ 🌻",
    answer: "sunflower",
    difficulty: 4,
    explanation: "Sun (☀️) + flower (🌻) = sunflower",
    category: "compound_words",
    hints: ["Think about nature", "Combine two elements", "A yellow flower that follows the sun"],
  },
  {
    rebusPuzzle: "🐝 4️⃣",
    answer: "before",
    difficulty: 5,
    explanation: "Bee (🐝) sounds like “be” + four (4️⃣) = before",
    category: "phonetic",
    hints: ["Think about sounds", "Phonetic wordplay", "Relates to time"],
  },
  {
    rebusPuzzle: "🌙 💡",
    answer: "moonlight",
    difficulty: 5,
    explanation: "Moon (🌙) + light (💡) = moonlight",
    category: "compound_words",
    hints: ["Think about nighttime", "Two elements combine", "Natural illumination"],
  },
  {
    rebusPuzzle: "🔥 🏠",
    answer: "fireplace",
    difficulty: 4,
    explanation: "Fire (🔥) + place/house (🏠) = fireplace",
    category: "compound_words",
    hints: ["Warmth indoors", "Combine the two icons", "Where logs burn at home"],
  },
  {
    rebusPuzzle: "⭐ 🐟",
    answer: "starfish",
    difficulty: 4,
    explanation: "Star (⭐) + fish (🐟) = starfish",
    category: "compound_words",
    hints: ["Ocean creature", "Combine the symbols", "Five-armed sea animal"],
  },
  {
    rebusPuzzle: "📖 🐛",
    answer: "bookworm",
    difficulty: 5,
    explanation: "Book (📖) + worm (🐛) = bookworm",
    category: "compound_words",
    hints: ["A kind of reader", "Combine the two icons", "Loves reading"],
  },
  {
    rebusPuzzle: "🌧️ 🧥",
    answer: "raincoat",
    difficulty: 4,
    explanation: "Rain (🌧️) + coat (🧥) = raincoat",
    category: "compound_words",
    hints: ["Wet weather gear", "Combine the icons", "Keeps you dry outside"],
  },
  {
    rebusPuzzle: "🦷 🧚",
    answer: "tooth fairy",
    difficulty: 5,
    explanation: "Tooth (🦷) + fairy (🧚) = tooth fairy",
    category: "phrases",
    hints: ["Childhood myth", "Two separate ideas", "Leaves coins under pillows"],
  },
  {
    rebusPuzzle: "⏰ ⏹️",
    answer: "timeout",
    difficulty: 5,
    explanation: "Time (⏰) + out/stop (⏹️) = timeout",
    category: "compound_words",
    hints: ["Sports / parenting pause", "Clock plus stop", "A short break"],
  },
  {
    rebusPuzzle: "🧠 🌊",
    answer: "brainstorm",
    difficulty: 5,
    explanation: "Brain (🧠) + storm (🌊/storm vibe) = brainstorm",
    category: "compound_words",
    hints: ["Creative session", "Mind + weather energy", "Throw ideas around"],
  },
  {
    rebusPuzzle: "👀 🍬",
    answer: "eye candy",
    difficulty: 6,
    explanation: "Eye (👀) + candy (🍬) = eye candy",
    category: "phrases",
    hints: ["Idiom for looks", "Sight + sweet", "Pleasing to look at"],
  },
  {
    rebusPuzzle: "🧊 💔",
    answer: "cold hearted",
    difficulty: 6,
    explanation: "Ice/cold (🧊) + broken/heart (💔) ≈ cold-hearted",
    category: "phrases",
    hints: ["Personality idiom", "Temperature + emotion", "Unfeeling"],
  },
] as const;

export function dayOfYearUtc(dateString: string): number {
  const [y, m, d] = dateString.split("-").map(Number);
  return Math.floor(
    (Date.UTC(y!, (m ?? 1) - 1, d ?? 1) - Date.UTC(y!, 0, 0)) / 86_400_000
  );
}

export function pickFallbackPuzzle(dateString: string): FallbackPuzzle {
  const idx = dayOfYearUtc(dateString) % FALLBACK_PUZZLES.length;
  return FALLBACK_PUZZLES[idx]!;
}

export type SeedMeta = {
  aiGenerated?: boolean;
  fallbackReason?: string;
  seedKind?: string;
};

/** True when today's row is an emergency / play-path seed Eve may still upgrade. */
export function isUpgradeableSeedPuzzle(puzzle: {
  aiGenerated?: boolean;
  fallbackReason?: string;
  seedKind?: string;
  metadata?: SeedMeta | null;
}): boolean {
  const meta = puzzle.metadata ?? {};
  if (puzzle.fallbackReason || meta.fallbackReason) return true;
  const seedKind = puzzle.seedKind ?? meta.seedKind;
  if (seedKind === "daily_guarantee" || seedKind === "play_path" || seedKind === "ai_failure") {
    return true;
  }
  if (puzzle.aiGenerated === false) return true;
  if (meta.aiGenerated === false) return true;
  return false;
}
