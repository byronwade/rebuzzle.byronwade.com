export async function checkGuess(guess: string, answer: string) {
	// Normalize both strings by:
	// 1. Converting to lowercase
	// 2. Removing all non-alphabetic characters (spaces, punctuation, etc.)
	// 3. Trimming whitespace
	const normalizedGuess = guess
		.toLowerCase()
		.replace(/[^a-z]/g, "")
		.trim();
	const normalizedAnswer = answer
		.toLowerCase()
		.replace(/[^a-z]/g, "")
		.trim();

	// Log for debugging (can be removed in production)
	console.log("Guess comparison:", {
		originalGuess: guess,
		normalizedGuess,
		originalAnswer: answer,
		normalizedAnswer,
		match: normalizedGuess === normalizedAnswer,
	});

	return {
		correct: normalizedGuess === normalizedAnswer,
		normalizedGuess,
		normalizedAnswer,
	};
}

