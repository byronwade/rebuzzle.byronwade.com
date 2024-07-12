"use client";
import WanderBox from "@/components/wanderBox";
import Image from "next/image";
import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import GameContext from "@/context/GameContext";
import CustomDialog from "@/components/CustomDialog";

const Game = () => {
	const { gameData, feedback, setFeedback, attemptsLeft, setAttemptsLeft, gameOver, setGameOver, hint } = useContext(GameContext);
	const router = useRouter();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogContent, setDialogContent] = useState({ title: "", description: "" });

	const { phrase, image } = gameData;

	const stopGame = () => {
		setGameOver(true);
		router.push("/rebus/loser");
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
			setGameOver(true);
			router.push("/rebus/winner");
		} else {
			setFeedback("Incorrect guess.");
			setAttemptsLeft(attemptsLeft - 1);

			if (attemptsLeft <= 1) {
				setFeedback(`Game over! The correct phrase was: "${phrase}"`);
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
		setDialogContent({
			title: "Incomplete Guess",
			description: "Please fill in all boxes.",
		});
		setDialogOpen(true);
	};

	return (
		<div className="container mx-auto px-4">
			<div className="flex items-center justify-center p-4">
				<div className="text-center">
					<div className="space-x-4">
						<Image src={image} alt="Rebus" width={500} height={500} className="rounded-md" />
					</div>
				</div>
			</div>

			<WanderBox phrase={phrase} onGuess={handleGuess} onEmptyBoxes={handleEmptyBoxes} feedback={feedback} hint={hint} attemptsLeft={attemptsLeft} gameOver={gameOver} />

			<CustomDialog open={dialogOpen} onOpenChange={setDialogOpen} title={dialogContent.title}>
				<div>{dialogContent.description}</div>
			</CustomDialog>
		</div>
	);
};

export default Game;
