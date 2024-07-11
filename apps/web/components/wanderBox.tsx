import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface WanderBoxProps {
	phrase: string;
	onGuess: (guess: string) => void;
	feedback: string;
	hint: string;
	attemptsLeft: number;
	gameOver: boolean;
}

const WanderBox: React.FC<WanderBoxProps> = ({ phrase, onGuess, feedback, hint, attemptsLeft, gameOver }) => {
	const isPunctuation = (char: string) => /[.,\/#!$%\^&\*;:{}=\-_`~()'"]/.test(char);

	const words = phrase.split(" ");
	const initialGuess = words.map((word) => Array.from(word).map((char) => (isPunctuation(char) ? char : "")));
	const [guess, setGuess] = useState<string[][]>(initialGuess);

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>, wordIndex: number, charIndex: number) => {
		const newGuess = [...guess];
		const inputChar = event.target.value.toUpperCase();

		if (/^[A-Z]$/.test(inputChar)) {
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

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, wordIndex: number, charIndex: number) => {
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
		const fullGuess = guess.map((word) => word.join("")).join(" ");

		// Check if all boxes are filled
		const allBoxesFilled = guess.every((word) => word.every((char) => char !== ""));
		if (!allBoxesFilled) {
			alert("Please fill in all boxes.");
			return;
		}

		onGuess(fullGuess);

		setGuess(initialGuess); // Clear the boxes by resetting to initial guess state
		document.getElementById("input-0-0")?.focus(); // Always refocus on the first input box
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
								className="w-12 h-12 text-center text-lg font-bold"
								autoComplete="off" // Disable browser autocomplete suggestions
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
				<p>Attempts Left: {attemptsLeft}</p>
			</div>
		</div>
	);
};

export default WanderBox;
