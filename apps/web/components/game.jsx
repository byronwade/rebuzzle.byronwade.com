import React, { useContext, useState, useEffect } from "react";
import GameContext from "@/context/GameContext";
import WanderBox from "@/components/wanderBox";
import GameCard from "@/components/gameCard";
import CustomDialog from "@/components/CustomDialog";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

const Game = () => {
	const { gameData, feedback, setFeedback, attemptsLeft, setAttemptsLeft, gameOver, setGameOver, hint } = useContext(GameContext);
	const [countdown, setCountdown] = useState("00:00:00");
	const [dialogOpen, setDialogOpen] = useState(false);

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

	useEffect(() => {
		if (gameOver) {
			setDialogOpen(true);
		}
	}, [gameOver]);

	const stopGame = () => {
		setGameOver(true);
		setDialogOpen(true);
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
			setFeedback("Correct!");
			stopGame();
		} else {
			setFeedback("Incorrect guess.");
			setAttemptsLeft((prevAttempts) => prevAttempts - 1);

			if (attemptsLeft <= 1) {
				setFeedback(`Game over! The correct phrase was: "${gameData.solution}"`);
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
		setFeedback("Incomplete Guess. Please fill in all boxes.");
	};

	const handleCloseDialog = () => {
		setDialogOpen(false);
		setGameOver(false);
		setFeedback("");
		setAttemptsLeft(3);
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
						<Image src={image} alt="Rebus" width={1980} height={1020} className="w-full md:w-1/2 h-auto m-auto rounded-md" priority />
					</div>
				</div>
			</div>

			<WanderBox phrase={phrase} onGuess={handleGuess} onEmptyBoxes={handleEmptyBoxes} feedback={feedback} hint={hint} attemptsLeft={attemptsLeft} gameOver={gameOver} />

			<CustomDialog open={dialogOpen} onOpenChange={setDialogOpen} title={feedback.includes("Correct!") ? "Correct!" : `Game over! The correct phrase was: "${gameData.solution}"`}>
				<GameCard gameData={gameData} onClose={handleCloseDialog} />
			</CustomDialog>
		</div>
	);
};

export default Game;