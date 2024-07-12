import React, { useState, useContext } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import GameContext from "@/context/GameContext";

const WanderBox = ({ phrase, onGuess, feedback, hint, attemptsLeft, gameOver }) => {
	const { gameData } = useContext(GameContext);

	const isPunctuation = (char) => /[.,\/#!$%\^&\*;:{}=\-_`~()'"]/.test(char);

	const words = phrase.split(" ");
	const initialGuess = words.map((word) => Array.from(word).map((char) => (isPunctuation(char) ? char : "")));
	const initialFeedback = words.map(() => "bg-white");
	const [guess, setGuess] = useState(initialGuess);
	const [feedbackState, setFeedbackState] = useState(initialFeedback);

	const handleChange = (event, wordIndex, charIndex) => {
		if (gameOver) return; // Disable changes if the game is over
		const newGuess = [...guess];
		const inputChar = event.target.value.toUpperCase();

		if (/^[A-Z0-9]$/.test(inputChar)) {
			newGuess[wordIndex][charIndex] = inputChar;
			setGuess(newGuess);

			// Automatically focus the next input box if a letter is entered
			let nextCharIndex = charIndex + 1;
			let nextWordIndex = wordIndex;

			while (nextWordIndex < words.length) {
				while (nextCharIndex < words[nextWordIndex].length) {
					if (!isPunctuation(words[nextWordIndex][nextCharIndex])) {
						document.getElementById(`input-${nextWordIndex}-${nextCharIndex}`)?.focus();
						return;
					}
					nextCharIndex++;
				}
				nextWordIndex++;
				nextCharIndex = 0;
			}
		}
	};

	const handleKeyDown = (event, wordIndex, charIndex) => {
		if (gameOver) return; // Disable changes if the game is over
		const newGuess = [...guess];
		if (event.key === "Backspace") {
			if (newGuess[wordIndex][charIndex] !== "") {
				// Clear the current box
				newGuess[wordIndex][charIndex] = "";
				setGuess(newGuess);
			} else {
				// Move to the previous box and clear it
				let prevCharIndex = charIndex - 1;
				let prevWordIndex = wordIndex;

				while (prevWordIndex >= 0) {
					while (prevCharIndex >= 0) {
						if (!isPunctuation(words[prevWordIndex][prevCharIndex])) {
							document.getElementById(`input-${prevWordIndex}-${prevCharIndex}`)?.focus();
							newGuess[prevWordIndex][prevCharIndex] = "";
							setGuess(newGuess);
							return;
						}
						prevCharIndex--;
					}
					prevWordIndex--;
					if (prevWordIndex >= 0) {
						prevCharIndex = words[prevWordIndex].length - 1;
					}
				}
			}
		} else if (event.key === "Enter") {
			handleSubmit();
		}
	};

	const handleSubmit = () => {
		if (gameOver) return; // Disable submit if the game is over
		const fullGuess = guess.map((word) => word.join("")).join(" ");

		// Check if all boxes are filled
		const allBoxesFilled = guess.every((word) => word.every((char) => char !== ""));
		if (!allBoxesFilled) {
			alert("Please fill in all boxes.");
			return;
		}

		const normalizedGuess = fullGuess
			.replace(/[^\w\s]|_/g, "")
			.replace(/\s+/g, " ")
			.toLowerCase();
		const normalizedPhrase = phrase
			.replace(/[^\w\s]|_/g, "")
			.replace(/\s+/g, " ")
			.toLowerCase();

		const guessWords = normalizedGuess.split(" ");
		const phraseWords = normalizedPhrase.split(" ");

		const newFeedback = guessWords.map((word, wordIndex) => {
			if (phraseWords[wordIndex] && guessWords[wordIndex] === phraseWords[wordIndex]) {
				return "bg-green-500";
			}
			return "bg-red-500";
		});

		setFeedbackState(newFeedback);
		onGuess(fullGuess);
	};

	return (
		<div className="flex flex-col items-center mt-4">
			{guess.map((word, wordIndex) => (
				<div key={wordIndex} className="flex space-x-2 mb-4">
					{word.map((char, charIndex) =>
						isPunctuation(char) ? (
							<span key={charIndex} className="text-2xl flex items-center justify-center">
								{char}
							</span>
						) : (
							<Input
								key={charIndex}
								id={`input-${wordIndex}-${charIndex}`}
								type="text"
								maxLength={1}
								value={char}
								onChange={(event) => handleChange(event, wordIndex, charIndex)}
								onKeyDown={(event) => handleKeyDown(event, wordIndex, charIndex)}
								className={`w-12 h-12 text-center text-lg font-bold ${feedbackState[wordIndex]}`}
								autoComplete="off" // Disable browser autocomplete suggestions
								disabled={gameOver} // Disable input if the game is over
							/>
						)
					)}
				</div>
			))}
			<Button onClick={handleSubmit} disabled={gameOver}>
				Submit Guess
			</Button>
			<div className="mt-4">
				{feedback && <p className="text-lg font-bold">{feedback}</p>}
				{hint && <p className="text-md italic text-gray-500">{hint}</p>}
			</div>
		</div>
	);
};

export default WanderBox;
