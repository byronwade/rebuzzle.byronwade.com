/**
 * Puzzle Uniqueness Tracking System
 *
 * Ensures generated puzzles are truly unique using:
 * - Semantic fingerprinting
 * - Component tracking
 * - Pattern analysis
 * - Similarity scoring
 */

import { getCollection } from "@/db/mongodb";
import { createMongoPuzzleNoveltyArchive } from "../puzzle-agent/mongo-novelty-archive";
import {
  buildPuzzleNoveltySignature,
  createInMemoryPuzzleNoveltyArchive,
  createPuzzleNoveltyModule,
  type PuzzleNoveltyAssessment,
  type PuzzleNoveltyCandidate,
} from "../puzzle-agent/novelty";
import type { PuzzleVisual } from "../puzzle-agent/visual/composition";

// ============================================================================
// FINGERPRINTING
// ============================================================================

/**
 * Create semantic fingerprint of a puzzle
 */
export function createPuzzleFingerprint(puzzle: {
  rebusPuzzle: string;
  answer: string;
  category: string;
  techniqueId?: string;
  visual?: PuzzleVisual;
}): string {
  return buildPuzzleNoveltySignature(puzzle).fingerprint;
}

/** One fail-closed archive assessment shared by tools and legacy callers. */
export async function evaluatePuzzleNovelty(
  puzzle: PuzzleNoveltyCandidate
): Promise<PuzzleNoveltyAssessment> {
  if (process.env.REBUZZLE_GENERATOR_ARCHIVE_MODE === "fixture") {
    const { RESERVE_PUZZLES } = await import("../puzzle-agent/reserve-puzzles");
    const now = Date.now();
    const archive = createInMemoryPuzzleNoveltyArchive(
      RESERVE_PUZZLES.map((entry, index) => ({
        ...entry,
        createdAt: new Date(now - index * 86_400_000),
        active: true,
      }))
    );
    return createPuzzleNoveltyModule({ archive }).evaluate(puzzle);
  }
  return createPuzzleNoveltyModule({ archive: createMongoPuzzleNoveltyArchive() }).evaluate(puzzle);
}

/**
 * Calculate similarity between two puzzles (0-1)
 */
export function calculateSimilarity(
  puzzle1: {
    rebusPuzzle?: string | null;
    puzzle?: string | null;
    answer: string;
  },
  puzzle2: {
    rebusPuzzle?: string | null;
    puzzle?: string | null;
    answer: string;
  }
): number {
  // Answer similarity (Levenshtein distance)
  const answer1 = puzzle1.answer || "";
  const answer2 = puzzle2.answer || "";
  const answerSim = levenshteinSimilarity(answer1.toLowerCase(), answer2.toLowerCase());

  // Emoji similarity (Jaccard index)
  // Handle both rebusPuzzle and puzzle field names, with null safety
  const puzzleText1 = puzzle1.rebusPuzzle || puzzle1.puzzle || "";
  const puzzleText2 = puzzle2.rebusPuzzle || puzzle2.puzzle || "";

  const emojiPattern = /[\p{Emoji}]/gu;
  const emojis1 = new Set(puzzleText1.match(emojiPattern) || []);
  const emojis2 = new Set(puzzleText2.match(emojiPattern) || []);
  const emojiSim = jaccardSimilarity(emojis1, emojis2);

  // Exact / near-exact answers dominate — generative boards often lack shared emoji
  if (answerSim >= 0.92) {
    return Math.max(answerSim, 0.92);
  }

  // Combined similarity (weighted toward answer; emoji is weak signal for SVG boards)
  return answerSim * 0.75 + emojiSim * 0.25;
}

function levenshteinSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1]!;
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]!) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length]!;
}

function jaccardSimilarity<T>(set1: Set<T>, set2: Set<T>): number {
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

// ============================================================================
// COMPONENT TRACKING
// ============================================================================

/**
 * Extract and track puzzle components
 */
export function extractComponents(rebusPuzzle: string | null | undefined): {
  emojis: string[];
  numbers: string[];
  text: string[];
  arrows: string[];
  symbols: string[];
} {
  // Handle null/undefined input
  const puzzleText = rebusPuzzle || "";

  const emojiPattern = /[\p{Emoji}]/gu;
  const numberPattern = /\d+/g;
  // Enhanced arrow pattern - includes more Unicode arrows and direction indicators
  const arrowPattern = /[⬆️⬇️➡️⬅️↗️↘️↙️↖️⏫⏬⏩⏪🔝🔙🔚🔛🔜→←↑↓↔↕⇒⇐⇑⇓⇔⇕⟶⟵⟹⟸⟷⟺⤴⤵⤶⤷⤸⤹⤺⤻]/g;

  const emojis = puzzleText.match(emojiPattern) || [];
  const numbers = puzzleText.match(numberPattern) || [];
  const arrows = puzzleText.match(arrowPattern) || [];

  // Extract text (non-emoji, non-number)
  const text = puzzleText
    .replace(emojiPattern, "")
    .replace(numberPattern, "")
    .replace(arrowPattern, "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => t.length > 0);

  // Extract symbols - includes Unicode math, shapes, and special characters
  const symbolPattern = /[±×÷≠≈≤≥∞∑∏√∫∆∇∂∝∈∉⊂⊃∪∩∅∀∃∄∴∵∶∷■□▲△●○◆◇★☆✦✧✩✪✫✬✭✮✯✰✱✲✳✴✵✶✷✸✹✺✻✼]/g;
  const unicodeSymbols = puzzleText.match(symbolPattern) || [];

  const symbols = [
    ...emojis.filter((e) => !/[\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/u.test(e)),
    ...unicodeSymbols,
  ];

  return { emojis, numbers, text, arrows, symbols };
}

/**
 * Check if component combination has been used recently
 */
export async function isComponentCombinationUnique(
  components: ReturnType<typeof extractComponents>,
  lookbackDays = 30
): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

  // Get recent puzzles
  const puzzlesCollection = getCollection("puzzles");
  const recentPuzzles = await puzzlesCollection.find({ createdAt: { $gte: cutoffDate } }).toArray();

  for (const existing of recentPuzzles) {
    // Handle both rebusPuzzle and puzzle field names, with null safety
    const existingPuzzleText = (existing as any).rebusPuzzle || (existing as any).puzzle || "";
    const existingComponents = extractComponents(existingPuzzleText);

    // Check if emoji sets are too similar (>70% overlap)
    const emojiSim = jaccardSimilarity(
      new Set(components.emojis),
      new Set(existingComponents.emojis)
    );

    if (emojiSim > 0.7) {
      return false; // Too similar
    }
  }

  return true;
}

// ============================================================================
// PATTERN DIVERSITY
// ============================================================================

/**
 * Identify puzzle pattern type
 */
export function identifyPattern(puzzle: {
  rebusPuzzle?: string | null;
  answer: string;
  explanation?: string | null;
}): {
  patternType: string;
  confidence: number;
  subPatterns: string[];
} {
  const puzzleText = puzzle.rebusPuzzle || "";
  const explanation = puzzle.explanation || "";
  const { emojis, numbers, text, arrows } = extractComponents(puzzleText);

  const patterns: string[] = [];

  // Detect pattern types
  if (emojis.length >= 2 && text.length === 0) {
    patterns.push("pure_emoji_compound");
  }
  if (numbers.length > 0 && /\d/.test(explanation)) {
    patterns.push("numeric_wordplay");
  }
  if (arrows.length > 0) {
    patterns.push("positional");
  }
  if (/sounds like|phonetic/i.test(explanation)) {
    patterns.push("phonetic");
  }
  if (text.some((t) => t !== t.toLowerCase() && t !== t.toUpperCase())) {
    patterns.push("mixed_case");
  }
  if (puzzle.answer.split(/\s+/).length > 2) {
    patterns.push("phrase");
  }

  const primaryPattern = patterns[0] || "unknown";

  return {
    patternType: primaryPattern,
    confidence: patterns.length > 0 ? 0.8 : 0.3,
    subPatterns: patterns,
  };
}

/**
 * Check pattern diversity (avoid overusing same pattern)
 */
export async function checkPatternDiversity(
  patternType: string,
  lookbackDays = 7
): Promise<{ isDiverse: boolean; usageCount: number; recommendation: string }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

  const puzzlesCollection = getCollection("puzzles");
  const recentPuzzles = await puzzlesCollection.find({ createdAt: { $gte: cutoffDate } }).toArray();

  // Count how many times this pattern was used
  let usageCount = 0;
  for (const puzzle of recentPuzzles) {
    // Handle both rebusPuzzle and puzzle field names, with null safety
    const puzzleText = (puzzle as any).rebusPuzzle || (puzzle as any).puzzle || "";
    const explanation = puzzle.explanation || "";
    const pattern = identifyPattern({
      rebusPuzzle: puzzleText,
      answer: puzzle.answer || "",
      explanation,
    });

    if (pattern.patternType === patternType) {
      usageCount++;
    }
  }

  const maxUsage = Math.ceil(lookbackDays / 3); // Max once per 3 days
  const isDiverse = usageCount < maxUsage;

  return {
    isDiverse,
    usageCount,
    recommendation: isDiverse
      ? "Pattern usage is good"
      : `Pattern "${patternType}" overused (${usageCount}/${maxUsage}). Try different pattern.`,
  };
}

// ============================================================================
// UNIQUENESS VALIDATION
// ============================================================================

/**
 * Comprehensive uniqueness check
 */
export async function validateUniqueness(puzzle: {
  rebusPuzzle: string;
  answer: string;
  category: string;
  explanation: string;
  techniqueId?: string;
  visual?: PuzzleVisual;
}): Promise<{
  isUnique: boolean;
  similarityScore: number;
  conflictingPuzzles: Array<{ id: string; similarity: number }>;
  recommendations: string[];
}> {
  const assessment = await evaluatePuzzleNovelty(puzzle);
  return {
    isUnique: assessment.isUnique,
    similarityScore: assessment.blockers.some((blocker) => blocker.startsWith("Answer already"))
      ? 1
      : assessment.evidence.closestStructuralSimilarity,
    conflictingPuzzles: assessment.conflicts.map((conflict) => ({
      id: conflict.puzzleId,
      similarity: conflict.structuralSimilarity,
    })),
    recommendations: assessment.recommendations,
  };
}

/**
 * Get uniqueness score for tracking
 */
export async function calculateUniquenessScore(puzzle: {
  rebusPuzzle: string;
  answer: string;
  category: string;
  explanation: string;
  techniqueId?: string;
  visual?: PuzzleVisual;
}): Promise<number> {
  return (await evaluatePuzzleNovelty(puzzle)).score;
}
