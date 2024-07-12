import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const WanderBox = ({ phrase, onGuess, onEmptyBoxes, feedback, hint, attemptsLeft, gameOver }) => {
	const isPunctuation = (char) => /[.,\/#!$%\^&\*;:{}=\-_`~()'"]/.test(char);

	const words = phrase.split(" ");
	const initialGuess = words.map((word) => Array.from(word).map((char) => (isPunctuation(char) ? char : "")));
	const [guess, setGuess] = useState(initialGuess);
	const [guessFeedback, setGuessFeedback] = useState(initialGuess.map((word) => word.map(() => "bg-white")));

	const handleChange = (event, wordIndex, charIndex) => {
		if (gameOver) return;
		const newGuess = [...guess];
		const inputChar = event.target.value.toUpperCase();

		if (/^[A-Z0-9]$/.test(inputChar)) {
			newGuess[wordIndex][charIndex] = inputChar;
			setGuess(newGuess);

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
		if (gameOver) return;
		const newGuess = [...guess];
		if (event.key === "Backspace") {
			if (newGuess[wordIndex][charIndex] !== "") {
				newGuess[wordIndex][charIndex] = "";
				setGuess(newGuess);
			} else {
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
		if (gameOver) return;
		const fullGuess = guess.map((word) => word.join("")).join(" ");

		const allBoxesFilled = guess.every((word) => word.every((char) => char !== ""));
		if (!allBoxesFilled) {
			onEmptyBoxes();
			return;
		}

		const normalizedGuess = fullGuess
			.replace(/[^a-zA-Z0-9\s]/g, "")
			.replace(/\s+/g, " ")
			.toLowerCase();
		const normalizedPhrase = phrase
			.replace(/[^a-zA-Z0-9\s]/g, "")
			.replace(/\s+/g, " ")
			.toLowerCase();

		const guessWords = normalizedGuess.split(" ");
		const phraseWords = normalizedPhrase.split(" ");

		const newFeedback = guess.map((word, wordIndex) =>
			word.map((char, charIndex) => {
				if (char && phraseWords[wordIndex]) {
					const guessWord = guessWords[wordIndex];
					const phraseWord = phraseWords[wordIndex];
					return guessWord === phraseWord ? "bg-green-500" : "bg-red-500";
				}
				return "bg-white";
			})
		);

		setGuessFeedback(newFeedback);

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
							<Input key={charIndex} id={`input-${wordIndex}-${charIndex}`} type="text" maxLength={1} value={char} onChange={(event) => handleChange(event, wordIndex, charIndex)} onKeyDown={(event) => handleKeyDown(event, wordIndex, charIndex)} className={`md:w-12 md:h-12 w-10 h-10 text-center md:text-lg text-[16px] font-bold ${guessFeedback[wordIndex][charIndex]}`} autoComplete="off" disabled={gameOver} />
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
