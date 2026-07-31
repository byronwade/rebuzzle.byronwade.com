/**
 * Build Wordle-style word feedback for a guess without leaking unused answer words.
 */

export type WordResult = {
  word: string;
  correct: boolean;
  similarity: number;
};

function similarity(a: string, b: string): number {
  if (a === b) return 100;
  if (!a || !b) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0]![j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1
        );
      }
    }
  }

  const distance = matrix[b.length]![a.length]!;
  const maxLength = Math.max(a.length, b.length);
  return Math.round((1 - distance / maxLength) * 100);
}

export function buildWordResults(guess: string, answer: string): WordResult[] {
  const guessWords = guess.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const answerWords = answer.trim().toUpperCase().split(/\s+/).filter(Boolean);

  return guessWords.map((word, index) => {
    const correctWord = answerWords[index] || "";
    const correct = Boolean(correctWord) && word === correctWord;
    return {
      word,
      correct,
      similarity: correct ? 100 : similarity(word, correctWord),
    };
  });
}
