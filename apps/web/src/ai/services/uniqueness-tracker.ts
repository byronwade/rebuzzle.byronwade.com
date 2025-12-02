/**
 * Puzzle Uniqueness Tracking System
 *
 * Ensures generated puzzles are truly unique using:
 * - Semantic fingerprinting
 * - Component tracking
 * - Pattern analysis
 * - Similarity scoring
 */

import { createHash } from "node:crypto";
import { getCollection } from "@/db/mongodb";

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
}): string {
  // Normalize answer
  const normalizedAnswer = puzzle.answer.toLowerCase().replace(/[^a-z0-9]/g, "");

  // Extract emojis
  const emojiPattern = /[\p{Emoji}]/gu;
  const emojis = (puzzle.rebusPuzzle.match(emojiPattern) || []).sort().join("");

  // Extract text components
  const textComponents = puzzle.rebusPuzzle
    .replace(emojiPattern, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase())
    .sort()
    .join("_");

  // Create composite fingerprint
  const composite = `${normalizedAnswer}::${emojis}::${textComponents}::${puzzle.category}`;

  return createHash("sha256").update(composite).digest("hex");
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

  // Combined similarity (weighted)
  return answerSim * 0.6 + emojiSim * 0.4;
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
}): Promise<{
  isUnique: boolean;
  similarityScore: number;
  conflictingPuzzles: Array<{ id: string; similarity: number }>;
  recommendations: string[];
}> {
  // Check fingerprint
  const fingerprint = createPuzzleFingerprint(puzzle);
  const puzzlesCollection = getCollection("puzzles");

  const existingWithFingerprint = await puzzlesCollection.findOne({
    "metadata.fingerprint": fingerprint,
  });

  if (existingWithFingerprint) {
    return {
      isUnique: false,
      similarityScore: 1.0,
      conflictingPuzzles: [{ id: existingWithFingerprint.id, similarity: 1.0 }],
      recommendations: ["This exact puzzle already exists. Generate a completely new one."],
    };
  }

  // Check semantic similarity
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30); // Look back 30 days

  const recentPuzzles = await puzzlesCollection
    .find({ createdAt: { $gte: cutoffDate } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const conflicts: Array<{ id: string; similarity: number }> = [];
  let maxSimilarity = 0;

  for (const existing of recentPuzzles) {
    // Handle both rebusPuzzle and puzzle field names for existing puzzles
    const existingPuzzleText = (existing as any).rebusPuzzle || (existing as any).puzzle || "";
    const puzzleText = puzzle.rebusPuzzle || "";
    const existingAnswer = existing.answer || "";
    const puzzleAnswer = puzzle.answer || "";

    const similarity = calculateSimilarity(
      { rebusPuzzle: puzzleText, answer: puzzleAnswer },
      {
        rebusPuzzle: existingPuzzleText,
        puzzle: existingPuzzleText,
        answer: existingAnswer,
      }
    );

    if (similarity > 0.7) {
      conflicts.push({ id: existing.id, similarity });
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }

  // Check component uniqueness
  const puzzleText = puzzle.rebusPuzzle || "";
  const components = extractComponents(puzzleText || "");
  const isComponentUnique = await isComponentCombinationUnique(components, 30);

  // Check pattern diversity
  const pattern = identifyPattern({ ...puzzle, rebusPuzzle: puzzleText });
  const patternCheck = await checkPatternDiversity(pattern.patternType, 7);

  const recommendations: string[] = [];
  if (!isComponentUnique) {
    recommendations.push("Emoji combination recently used. Try different visual elements.");
  }
  if (!patternCheck.isDiverse) {
    recommendations.push(patternCheck.recommendation);
  }
  if (conflicts.length > 0) {
    recommendations.push(
      `Too similar to ${conflicts.length} existing puzzles. Make it more unique.`
    );
  }

  return {
    isUnique: conflicts.length === 0 && isComponentUnique,
    similarityScore: maxSimilarity,
    conflictingPuzzles: conflicts,
    recommendations,
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
}): Promise<number> {
  const validation = await validateUniqueness(puzzle);

  if (!validation.isUnique) return 0;

  // Score based on how different it is
  const baseScore = 100;
  const similarityPenalty = validation.similarityScore * 30;
  const componentPenalty = validation.conflictingPuzzles.length * 10;

  return Math.max(0, baseScore - similarityPenalty - componentPenalty);
}
