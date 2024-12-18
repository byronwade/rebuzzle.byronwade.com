export async function checkGuess(guess: string, answer: string) {
  // Remove non-alphabetic characters and convert to lowercase for comparison
  const normalizedGuess = guess.toLowerCase().replace(/[^a-z]/g, '')
  const normalizedAnswer = answer.toLowerCase().replace(/[^a-z]/g, '')
  
  return { correct: normalizedGuess === normalizedAnswer }
}

