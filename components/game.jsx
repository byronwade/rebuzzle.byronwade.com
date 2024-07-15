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
	const { gameData, setFeedback, attemptsLeft, setAttemptsLeft, gameOver, setGameOver } = useContext(GameContext);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogMessage, setDialogMessage] = useState("");
	const [showGameCard, setShowGameCard] = useState(false);

	useEffect(() => {
		const handleGlobalKeyDown = (event) => {
			if (event.key === "Enter" && dialogOpen) {
				event.preventDefault();
				event.stopPropagation();
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => {
			window.removeEventListener("keydown", handleGlobalKeyDown);
		};
	}, [dialogOpen]);

	useEffect(() => {
		if (gameOver) {
			setDialogOpen(true);
			setShowGameCard(true);

			const eventDetails = {
				action: dialogMessage.includes("Correct!") ? "win" : "lose",
				category: "Game",
				label: dialogMessage.includes("Correct!") ? "Player Win" : "Player Lose",
				value: dialogMessage.includes("Correct!") ? 1 : 0,
			};

			// Track the event with Google Analytics
			trackEvent(eventDetails);

			// Save the event to the database
			// saveGameEvent(user?.id, eventDetails);
		}
	}, [gameOver, dialogMessage, user]);

	const stopGame = (message) => {
		setGameOver(true);
		setDialogMessage(message);
		setDialogOpen(true);
		setShowGameCard(true);
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
			// saveGameEvent(user?.id, eventDetails);
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
			stopGame("Correct! You guessed the phrase.");
		} else {
			setFeedback("Incorrect guess.");
			setAttemptsLeft((prevAttempts) => prevAttempts - 1);

			if (attemptsLeft <= 1) {
				setFeedback(`Game over! The correct phrase was: "${gameData.solution}"`);
				stopGame(`Game over! The correct phrase was: "${gameData.solution}"`);
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
			// saveGameEvent(user?.id, eventDetails);
		}
	};

	const handleEmptyBoxes = () => {
		setDialogMessage("Incomplete Guess. Please fill in all boxes.");
		setDialogOpen(true);
		setShowGameCard(false);
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

			<WanderBox phrase={phrase} onGuess={handleGuess} onEmptyBoxes={handleEmptyBoxes} attemptsLeft={attemptsLeft} gameOver={gameOver} />

			<CustomDialog open={dialogOpen} onOpenChange={setDialogOpen} title={dialogMessage}>
				{showGameCard && <GameCard gameData={gameData} onClose={handleCloseDialog} />}
			</CustomDialog>
		</div>
	);
};

export default Game;