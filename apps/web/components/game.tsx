"use client";
import WanderBox from "@/components/wanderBox";
import Image from "next/image";
import { useState, useEffect } from "react";

interface GameSettings {
	attempts: number;
}

interface GameData {
	phrase: string;
	image: string;
	explanation: string;
}

interface HomeProps {
	gameData: GameData;
	settings: GameSettings;
}

const Game: React.FC<HomeProps> = ({ gameData, settings }) => {
	const [guesses, setGuesses] = useState<string[]>([]);
	const [feedback, setFeedback] = useState<string>("");
	const [hint, setHint] = useState<string>("");
	const [attemptsLeft, setAttemptsLeft] = useState<number>(settings.attempts);
	const [gameOver, setGameOver] = useState<boolean>(false);
	const [isHydrated, setIsHydrated] = useState<boolean>(false);
	const [countdown, setCountdown] = useState<number>(0);

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

	const formatCountdown = (milliseconds: number) => {
		const totalSeconds = Math.floor(milliseconds / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	};

	const stopGame = (reason: string) => {
		setGameOver(true);
		exportGameData(false, reason);
	};

	const checkGuess = (guess: string) => {
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
			exportGameData(true, "Guessed correctly");
			setGameOver(true);
		} else {
			setFeedback("Incorrect guess.");
			setGuesses([...guesses, guess]);
			setAttemptsLeft(attemptsLeft - 1); // Decrease attempts left

			if (attemptsLeft <= 1) {
				alert("No attempts left. Game over!");
				setFeedback(`Game over! The correct phrase was: "${phrase}"`);
				stopGame(`No attempts left. Explanation: ${explanation}`);
			}
		}
	};

	const handleGuess = (guess: string) => {
		if (attemptsLeft > 0 && !gameOver) {
			checkGuess(guess);
		}
	};

	const exportGameData = (correct: boolean, reason: string) => {
		const gameData = {
			phrase,
			attempts: guesses.length,
			correct,
			guesses,
			reason,
		};

		setGuesses((prevGuesses) => [...prevGuesses, JSON.stringify(gameData, null, 2)]);
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

			<WanderBox phrase={phrase} onGuess={handleGuess} feedback={feedback} hint={hint} attemptsLeft={attemptsLeft} gameOver={gameOver} />

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
