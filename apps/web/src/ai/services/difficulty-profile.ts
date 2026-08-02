export interface DifficultyProfile {
  visualAmbiguity: number;
  cognitiveSteps: number;
  culturalKnowledge: number;
  vocabularyLevel: number;
  patternNovelty: number;
  overallDifficulty: number;
}

/** Pure heuristic profile shared by generation and AI-assisted calibration. */
export function calculateDifficultyProfile(puzzle: {
  rebusPuzzle: string;
  answer: string;
  explanation: string;
  category: string;
}): DifficultyProfile {
  const emojiCount = (puzzle.rebusPuzzle.match(/[\p{Emoji}]/gu) || []).length;
  const visualAmbiguity = Math.min(10, Math.max(1, emojiCount * 1.5));
  const stepIndicators = ["+", "→", "=", "sounds like", "positioned", "represents"];
  const cognitiveSteps = Math.min(
    10,
    stepIndicators.filter((indicator) => puzzle.explanation.toLowerCase().includes(indicator))
      .length * 2
  );
  const isIdiom = puzzle.category.includes("idiom") || puzzle.category.includes("phrase");
  const culturalKnowledge = isIdiom ? 7 : puzzle.answer.split(/\s+/).length * 2;
  const vocabularyLevel = Math.min(
    10,
    Math.max(1, puzzle.answer.length / 3 + (puzzle.answer.split(/\s+/).length - 1) * 2)
  );
  const rarePatterns = ["positional", "mathematical", "lateral_thinking", "multi_layer"];
  const patternNovelty = rarePatterns.includes(puzzle.category) ? 8 : 5;
  const overallDifficulty = Math.round(
    visualAmbiguity * 0.2 +
      cognitiveSteps * 0.3 +
      culturalKnowledge * 0.2 +
      vocabularyLevel * 0.15 +
      patternNovelty * 0.15
  );

  return {
    visualAmbiguity,
    cognitiveSteps,
    culturalKnowledge,
    vocabularyLevel,
    patternNovelty,
    overallDifficulty,
  };
}
