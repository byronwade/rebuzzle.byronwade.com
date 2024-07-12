"use client";
import WanderBox from "@/components/wanderBox";
import GameCard from "@/components/gameCard";
import Image from "next/image";
import { useContext } from "react";
import GameContext from "@/context/GameContext";

const Game = ({ gameData }) => {
	const { feedback, setFeedback, attemptsLeft, setAttemptsLeft, gameOver, setGameOver, hint, countdown, setHint } = useContext(GameContext);

	const { phrase, image, explanation } = gameData;

	const stopGame = (explanation) => {
		setGameOver(true);
		exportGameData(false, explanation);
	};

	const checkGuess = (guess) => {
		const normalizedGuess = guess
			.replace(/[^a-zA-Z0-9\s]/g, "")
			.replace(/\s+/g, "")
			.toLowerCase();
		const normalizedPhrase = phrase
			.replace(/[^a-zA-Z0-9\s]/g, "")
			.replace(/\s+/g, "")
			.toLowerCase();

		if (normalizedGuess === normalizedPhrase) {
			setFeedback("Correct!");
			alert("Congratulations! You've guessed the phrase.");
			exportGameData(true, explanation);
			setGameOver(true);
		} else {
			setFeedback("Incorrect guess.");
			setAttemptsLeft(attemptsLeft - 1);

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
			attempts: attemptsLeft,
			correct,
			explanation,
		};
	};

	return (
		<>
			<div className="flex items-center justify-center p-4">
				<div className="text-center">
					<div className="space-x-4">
						<Image src={image} alt="Rebus" width={500} height={500} className="rounded-md" />
					</div>
				</div>
			</div>

			<WanderBox phrase={phrase} onGuess={handleGuess} feedback={feedback} hint={hint} attemptsLeft={attemptsLeft} gameOver={gameOver} />

			{gameOver && (
				<div className="mt-4 text-center">
					<GameCard gameData={gameData} />
				</div>
			)}
		</>
	);
};

export default Game;
