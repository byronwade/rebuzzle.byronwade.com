/**
 * Check if guess matches answer
 *
 * Enhanced normalization for better matching:
 * - Handles accented characters
 * - Case insensitive
 * - Removes punctuation and spaces
 * - Handles common variations
 */
export async function checkGuess(guess: string, answer: string) {
  // Enhanced normalization
  const normalize = (str: string) =>
    str
      .toLowerCase()
      // Normalize accented characters
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // Remove all non-alphanumeric characters
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const normalizedGuess = normalize(guess);
  const normalizedAnswer = normalize(answer);

  // Check exact match
  const exactMatch = normalizedGuess === normalizedAnswer;

  // Calculate similarity for near-misses
  const similarity = calculateSimilarity(normalizedGuess, normalizedAnswer);

  // Consider it correct if:
  // 1. Exact match
  // 2. Very close match (>= 95% similar - likely typo)
  const correct = exactMatch || similarity >= 0.95;

  // Log for debugging
  if (process.env.NODE_ENV === "development") {
    console.log("Guess comparison:", {
      originalGuess: guess,
      normalizedGuess,
      originalAnswer: answer,
      normalizedAnswer,
      similarity: similarity.toFixed(2),
      match: correct,
    });
  }

  return {
    correct,
    normalizedGuess,
    normalizedAnswer,
    similarity,
    exactMatch,
  };
}

/**
 * Calculate string similarity (Levenshtein distance based)
 */
function calculateSimilarity(s1: string, s2: string): number {
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
