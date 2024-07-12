"use client";
import WanderBox from "@/components/wanderBox";
import GameCard from "@/components/gameCard"; // Make sure to update the import path accordingly
import Image from "next/image";
import { useState, useEffect } from "react";

const Game = ({ gameData, settings = { attempts: 3 } }) => {
	const [guesses, setGuesses] = useState([]);
	const [feedback, setFeedback] = useState("");
	const [hint, setHint] = useState("");
	const [attemptsLeft, setAttemptsLeft] = useState(settings.attempts);
	const [gameOver, setGameOver] = useState(false);
	const [isHydrated, setIsHydrated] = useState(false);
	const [countdown, setCountdown] = useState(0);
	const [guessFeedback, setGuessFeedback] = useState([]);

	const { phrase, image, explanation } = gameData;

	useEffect(() => {
		setIsHydrated(true);

		// Calculate time remaining until midnight for countdown
		const now = new Date();
		const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
		const timeUntilMidnight = nextMidnight.getTime() - now.getTime();
		setCountdown(timeUntilMidnight);

		const interval = setInterval(() => {
			setCountdown((prev) => prev - 1000);
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	const formatCountdown = (milliseconds) => {
		const totalSeconds = Math.floor(milliseconds / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	};

	const stopGame = (explanation) => {
		setGameOver(true);
		exportGameData(false, explanation);
	};

	const checkGuess = (guess) => {
		const normalizedGuess = guess
			.replace(/[^\w\s]|_/g, "")
			.replace(/\s+/g, "")
			.toLowerCase();
		const normalizedPhrase = phrase
			.replace(/[^\w\s]|_/g, "")
			.replace(/\s+/g, "")
			.toLowerCase();

		if (normalizedGuess === normalizedPhrase) {
			setFeedback("Correct!");
			alert("Congratulations! You've guessed the phrase.");
			exportGameData(true, explanation);
			setGameOver(true);
			setGuessFeedback(Array(phrase.length).fill("correct"));
		} else {
			setFeedback("Incorrect guess.");
			setGuesses([...guesses, guess]);
			setAttemptsLeft(attemptsLeft - 1);

			const wordFeedback = guess.split(" ").map((word, index) => {
				const normalizedWord = word
					.replace(/[^\w\s]|_/g, "")
					.replace(/\s+/g, "")
					.toLowerCase();
				const phraseWords = phrase
					.split(" ")
					[index].replace(/[^\w\s]|_/g, "")
					.replace(/\s+/g, "")
					.toLowerCase();
				return normalizedWord === phraseWords ? "correct" : "incorrect";
			});
			setGuessFeedback(wordFeedback);

			if (attemptsLeft <= 1) {
				alert("No attempts left. Game over!");
				setFeedback(`Game over! The correct phrase was: "${phrase}"`);
				stopGame(explanation);
			}
		}
	};

	const handleGuess = (guess) => {
		if (attemptsLeft > 0 && !gameOver) {
			checkGuess(guess);
		}
	};

	const exportGameData = (correct, explanation) => {
		const gameData = {
			phrase,
			attempts: guesses.length,
			correct,
			guesses,
			explanation, // Use explanation from gameData
		};

		setGuesses((prevGuesses) => [...prevGuesses]);
	};

	return isHydrated ? (
		<>
			<div className="flex items-center justify-center p-4">
				<div className="text-center">
					<div className="space-x-4">
						<Image src={image} alt="Rebus" width={500} height={500} className="rounded-md" />
					</div>
				</div>
			</div>

			<WanderBox phrase={phrase} onGuess={handleGuess} feedback={feedback} hint={hint} attemptsLeft={attemptsLeft} gameOver={gameOver} guessFeedback={guessFeedback} />

			{gameOver && (
				<div className="mt-4 text-center">
					<GameCard gameData={gameData} />
				</div>
			)}

			<div className="mt-4 text-center">
				{guesses.map((guess, index) => (
					<div key={index} className="mb-2 whitespace-pre-wrap">
						{guess}
					</div>
				))}
				{gameOver && (
					<div>
						<p>Next puzzle available in: {formatCountdown(countdown)}</p>
					</div>
				)}
			</div>
		</>
	) : null;
};

export default Game;
