"use client";
import React, { useContext, useState, useEffect } from "react";
import GameContext from "@/context/GameContext";
import WanderBox from "@/components/wanderBox";
import GameCard from "@/components/gameCard";
import CustomDialog from "@/components/CustomDialog";
import Image from "next/image";
import Loading from "@/components/Loading";
import Countdown from "@/components/Countdown";
import { trackEvent } from "@/lib/gtag";
import { useUser } from "@/context/UserContext";

const Game = () => {
	const { user } = useUser();
	const { gameData, feedback, setFeedback, attemptsLeft, setAttemptsLeft, gameOver, setGameOver } = useContext(GameContext);
	const [dialogOpen, setDialogOpen] = useState(false);
	console.log("debugging");

	useEffect(() => {
		if (gameOver) {
			setDialogOpen(true);
			const eventDetails = {
				action: feedback.includes("Correct!") ? "win" : "lose",
				category: "Game",
				label: feedback.includes("Correct!") ? "Player Win" : "Player Lose",
				value: feedback.includes("Correct!") ? 1 : 0,
			};

			// Track the event with Google Analytics
			trackEvent(eventDetails);

			// Save the event to the database
			// saveGameEvent(user?.id, eventDetails);
		}
	}, [gameOver, feedback, user]);

	const stopGame = () => {
		setGameOver(true);
		setDialogOpen(true);
	};

	useEffect(() => {
		if (gameData) {
			const eventDetails = {
				action: "start_game",
				category: "Game",
				label: "Game Started",
				value: 1,
			};

			// Track game start with Google Analytics
			trackEvent(eventDetails);

			// Save game start to the database
			saveGameEvent(user?.id, eventDetails);
		}
	}, [gameData, user]);

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

			const normalizedGuess = guess
				.replace(/[^a-zA-Z0-9\s]/g, "")
				.replace(/\s+/g, "")
				.toLowerCase();

			const eventDetails = {
				action: "guess",
				category: "Game",
				label: normalizedGuess,
				value: attemptsLeft,
			};

			// Track the guess attempt with Google Analytics
			trackEvent(eventDetails);

			// Save the guess attempt to the database
			saveGameEvent(user?.id, eventDetails);
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
		return <Loading />;
	}

	const { solution: phrase, image_url: image } = gameData;

	return (
		<div className="container mx-auto px-4">
			<div className="flex items-center justify-center p-4">
				<div className="text-center">
					<Countdown />
					<div className="space-x-4">
						<Image src={image} alt="Rebus" width={1980} height={1020} className="w-full md:w-1/2 h-auto m-auto rounded-md" priority />
					</div>
				</div>
			</div>

			<WanderBox phrase={phrase} onGuess={handleGuess} onEmptyBoxes={handleEmptyBoxes} feedback={feedback} attemptsLeft={attemptsLeft} gameOver={gameOver} />

			<CustomDialog open={dialogOpen} onOpenChange={setDialogOpen} title={feedback.includes("Correct!") ? "Correct!" : `Game over! The correct phrase was: "${gameData.solution}"`}>
				<GameCard gameData={gameData} onClose={handleCloseDialog} />
			</CustomDialog>
		</div>
	);
};

export default Game;
