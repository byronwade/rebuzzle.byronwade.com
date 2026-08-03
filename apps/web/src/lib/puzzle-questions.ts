/** The prompt shown under the puzzle, per type. */
const QUESTIONS: Record<string, string> = {
  rebus: "What does this rebus puzzle represent?",
  "word-puzzle": "What is the answer to this word puzzle?",
  riddle: "What is the answer to this riddle?",
  "logic-grid": "Use deductive reasoning to solve this logic grid puzzle",
  "number-sequence": "What comes next in this number sequence?",
  "caesar-cipher": "Decode this encrypted message",
  "word-ladder": "Transform the start word into the end word",
  "pattern-recognition": "What pattern comes next?",
  trivia: "What is the answer to this trivia question?",
  "cryptic-crossword": "Solve this cryptic crossword clue",
};

export function getPuzzleQuestion(puzzleType = "rebus"): string {
  return QUESTIONS[puzzleType] ?? "What is the answer to this puzzle?";
}
