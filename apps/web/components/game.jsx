import React, { useContext, useState, useEffect } from "react";
import GameContext from "@/context/GameContext";
import WanderBox from "@/components/wanderBox";
import GameCard from "@/components/GameCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const Game = () => {
	const { gameData, feedback, setFeedback, attemptsLeft, setAttemptsLeft, gameOver, setGameOver, hint } = useContext(GameContext);
	const [countdown, setCountdown] = useState("00:00:00");

	useEffect(() => {
		const interval = setInterval(() => {
			const now = new Date();
			const midnight = new Date(now);
			midnight.setHours(24, 0, 0, 0);
			const diff = midnight - now;
			const hours = Math.floor(diff / (1000 * 60 * 60));
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
			const seconds = Math.floor((diff % (1000 * 60)) / 1000);
			setCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	const stopGame = () => {
		setGameOver(true);
	};

	const checkGuess = (guess) => {
		const normalizedGuess = guess
			.replace(/[^a-zA-Z0-9\s]/g, "")
			.replace(/\s+/g, "")
			.toLowerCase();
		const normalizedPhrase = gameData.solution
			.replace(/[^a-zA-Z0-9\s]/g, "")
			.replace(/\s+/g, "")
			.toLowerCase();

		if (normalizedGuess === normalizedPhrase) {
			setFeedback("Correct!"); // Set feedback as a string
			stopGame();
		} else {
			setFeedback("Incorrect guess."); // Set feedback as a string
			setAttemptsLeft((prevAttempts) => prevAttempts - 1);

			if (attemptsLeft <= 1) {
				setFeedback(`Game over! The correct phrase was: "${gameData.solution}"`); // Set feedback as a string
				stopGame();
			}
		}
	};

	const handleGuess = (guess) => {
		if (attemptsLeft > 0 && !gameOver) {
			checkGuess(guess);
		}
	};

	const handleEmptyBoxes = () => {
		setFeedback("Incomplete Guess. Please fill in all boxes."); // Set feedback as a string
	};

	const handleCloseDialog = () => {
		setGameOver(false); // Reset the game over state when closing
		setFeedback(""); // Reset feedback to an empty string
		setAttemptsLeft(3); // Reset attempts
	};

	if (!gameData) {
		return <div>Loading...</div>;
	}

	const { solution: phrase, image_url: image } = gameData;

	return (
		<div className="container mx-auto px-4">
			<div className="flex items-center justify-center p-4">
				<div className="text-center">
					<Badge variant="outline" className="mb-4">
						Next puzzle available in: {countdown}
					</Badge>
					<div className="space-x-4">
						<Image src={image} alt="Rebus" width={1980} height={1020} className="w-1/2 h-auto m-auto rounded-md" priority />
					</div>
				</div>
			</div>

			<WanderBox phrase={phrase} onGuess={handleGuess} onEmptyBoxes={handleEmptyBoxes} feedback={feedback} hint={hint} attemptsLeft={attemptsLeft} gameOver={gameOver} />

			{gameOver && typeof feedback === "string" && <GameCard gameData={gameData} />}
		</div>
	);
};

export default Game;
